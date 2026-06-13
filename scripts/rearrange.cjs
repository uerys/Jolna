const fs = require('fs');
const content = fs.readFileSync('c:/fyp/client/src/pages/physio/ClientDetail.tsx', 'utf-8');
const lines = content.split('\n');

const gridStart = lines.findIndex(l => l.includes('<div className={`grid grid-cols-1 gap-4 mb-6'));
const gridEnd = lines.findIndex((l, i) => i > gridStart && l.trim() === '</div>' && lines[i-1].trim() === '</Card>');

const filterStart = lines.findIndex(l => l.includes('{/* Dashboard Filters Card (Top) */}'));
const filterEnd = lines.findIndex((l, i) => i > filterStart && l.trim() === '</Card>');

console.log('grid:', gridStart, gridEnd);
console.log('filter:', filterStart, filterEnd);

if (gridStart > 0 && gridEnd > gridStart && filterStart > gridEnd && filterEnd > filterStart) {
  const beforeGrid = lines.slice(0, gridStart);
  const gridBlock = lines.slice(gridStart, gridEnd + 1);
  const between = lines.slice(gridEnd + 1, filterStart);
  const filterBlock = lines.slice(filterStart, filterEnd + 1);
  const afterFilter = lines.slice(filterEnd + 1);
  
  gridBlock[0] = '        <div className={`grid grid-cols-1 gap-4 mb-6 ${viewMode === "historical" || (viewMode === "active" && selectedAssignment === "all") ? "md:grid-cols-2" : "md:grid-cols-3"}`}>';
  
  const adCardIdx = gridBlock.findIndex(l => l.includes('{viewMode === "active" && ('));
  if (adCardIdx !== -1) {
    gridBlock[adCardIdx] = '          {viewMode === "active" && selectedAssignment !== "all" && (';
  }
  
  const newLines = [...beforeGrid, ...filterBlock, '', ...gridBlock, ...between, ...afterFilter];
  fs.writeFileSync('c:/fyp/client/src/pages/physio/ClientDetail.tsx', newLines.join('\n'), 'utf-8');
  console.log('Success!');
} else {
  console.log('Failed to match boundaries.');
}
