import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => {
  return {
    getUserById: vi.fn(),
    updateUserFields: vi.fn(),
    createNotification: vi.fn(),
    createAuditLog: vi.fn(),
  };
});

import { appRouter } from "./routers";
import { getUserById, updateUserFields, createNotification } from "./db";

// Helper to make admin context
function makeAdminCtx() {
  return {
    user: {
      id: 1,
      role: "admin",
      status: "active",
    } as any,
    originalUser: {
      id: 1,
      role: "admin",
      status: "active",
    } as any,
    req: {} as any,
    res: {} as any,
  };
}

describe("Admin physiotherapist assignment notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create notifications for client and physio when client is assigned to a new physio", async () => {
    const clientUser = { id: 10, name: "Test Client", physiotherapistId: null };
    const physioUser = { id: 20, name: "Test Physio", role: "physiotherapist" };

    vi.mocked(getUserById).mockImplementation(async id => {
      if (id === 10) return clientUser as any;
      if (id === 20) return physioUser as any;
      return null;
    });

    vi.mocked(updateUserFields).mockResolvedValue({
      ...clientUser,
      physiotherapistId: 20,
    } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.admin.assignClientToPhysio({
      clientId: 10,
      physiotherapistId: 20,
    });

    // Check that updateUserFields was called
    expect(updateUserFields).toHaveBeenCalledWith(10, {
      physiotherapistId: 20,
    });

    // Check that createNotification was called twice
    expect(createNotification).toHaveBeenCalledTimes(2);

    // Notification to Client
    expect(createNotification).toHaveBeenNthCalledWith(1, {
      recipientId: 10,
      actorId: 1,
      type: "physio_assigned",
      title:
        "Physiotherapist Assigned / គ្រូពេទ្យព្យាបាលដោយចលនាត្រូវបានចាត់តាំង",
      content:
        "Test Physio has been assigned to you. / Test Physio ត្រូវបានចាត់តាំងជូនអ្នកហើយ។",
      href: "/client/exercises",
    });

    // Notification to Physio
    expect(createNotification).toHaveBeenNthCalledWith(2, {
      recipientId: 20,
      actorId: 1,
      type: "client_assigned",
      title: "New Client Assigned / អ្នកជំងឺថ្មីត្រូវបានចាត់តាំង",
      content:
        "Test Client has been assigned to you. / Test Client ត្រូវបានចាត់តាំងជូនអ្នកហើយ។",
      href: "/physio/clients/10",
    });
  });

  it("should create unassignment notifications when physio is set to null", async () => {
    const clientUser = { id: 10, name: "Test Client", physiotherapistId: 20 };

    vi.mocked(getUserById).mockImplementation(async id => {
      if (id === 10) return clientUser as any;
      return null;
    });

    vi.mocked(updateUserFields).mockResolvedValue({
      ...clientUser,
      physiotherapistId: null,
    } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.admin.assignClientToPhysio({
      clientId: 10,
      physiotherapistId: null,
    });

    expect(updateUserFields).toHaveBeenCalledWith(10, {
      physiotherapistId: null,
    });
    expect(createNotification).toHaveBeenCalledTimes(2);

    // Notification to Client
    expect(createNotification).toHaveBeenNthCalledWith(1, {
      recipientId: 10,
      actorId: 1,
      type: "physio_assigned",
      title:
        "Physiotherapist Unassigned / គ្រូពេទ្យព្យាបាលដោយចលនាត្រូវបានដកចេញ",
      content:
        "You have been unassigned from your physiotherapist. / អ្នកត្រូវបានដកចេញពីគ្រូពេទ្យព្យាបាលដោយចលនារបស់អ្នកហើយ។",
      href: "/",
    });

    // Notification to Old Physio
    expect(createNotification).toHaveBeenNthCalledWith(2, {
      recipientId: 20,
      actorId: 1,
      type: "client_assigned",
      title: "Client Unassigned / អ្នកជំងឺត្រូវបានដកចេញ",
      content:
        "Test Client has been unassigned from you. / Test Client ត្រូវបានដកចេញពីអ្នកហើយ។",
      href: "/physio",
    });
  });

  it("should not create notifications when physiotherapistId is unchanged", async () => {
    const clientUser = { id: 10, name: "Test Client", physiotherapistId: 20 };

    vi.mocked(getUserById).mockImplementation(async id => {
      if (id === 10) return clientUser as any;
      return null;
    });

    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.admin.assignClientToPhysio({
      clientId: 10,
      physiotherapistId: 20,
    });

    expect(updateUserFields).toHaveBeenCalledWith(10, {
      physiotherapistId: 20,
    });
    expect(createNotification).not.toHaveBeenCalled();
  });
});
