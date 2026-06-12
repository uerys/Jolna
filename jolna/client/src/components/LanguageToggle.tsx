import { useI18n } from "@/contexts/I18nContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "kh") }>
      <SelectTrigger
        className="h-10 w-[84px] shrink-0 rounded-full border-2 border-blue-100 bg-white px-3 text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
        aria-label="Language"
      >
        <SelectValue placeholder="EN" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="kh">ខ្មែរ</SelectItem>
      </SelectContent>
    </Select>
  );
}
