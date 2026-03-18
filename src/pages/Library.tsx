import { useState } from "react";
import { Search, Play, Trash2 } from "lucide-react";
import { MainLayout } from "@/components/MainLayout";

const subjects = ["All", "Biology", "Physics", "Chemistry", "Astronomy", "Engineering"];

const mockModels = [
  { id: 1, name: "Human Heart", subject: "Biology", date: "2 days ago", steps: 6, duration: "4 min" },
  { id: 2, name: "DNA Double Helix", subject: "Biology", date: "5 days ago", steps: 5, duration: "3 min" },
  { id: 3, name: "Solar System", subject: "Astronomy", date: "1 week ago", steps: 6, duration: "5 min" },
  { id: 4, name: "Atom Structure", subject: "Physics", date: "1 week ago", steps: 5, duration: "3 min" },
  { id: 5, name: "Cell Division", subject: "Biology", date: "2 weeks ago", steps: 6, duration: "4 min" },
  { id: 6, name: "Electric Circuit", subject: "Physics", date: "2 weeks ago", steps: 5, duration: "3 min" },
];

export default function Library() {
  const [activeSubject, setActiveSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockModels.filter(
    (m) =>
      (activeSubject === "All" || m.subject === activeSubject) &&
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="Library">
      <div className="p-6 md:p-8 overflow-y-auto h-full pb-20 md:pb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-[28px] font-semibold text-primary-custom">Library</h1>
          <div className="relative w-full md:w-72">
            <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-custom" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search simulations..."
              className="w-full bg-card border border-border rounded-lg h-10 pl-9 pr-4 text-sm text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors duration-150 ${
                activeSubject === s
                  ? "border-accent text-accent font-medium"
                  : "border-transparent text-secondary-custom hover:text-primary-custom"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((model) => (
            <div
              key={model.id}
              className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250"
            >
              <div className="h-[180px] bg-canvas rounded-t-xl flex items-center justify-center relative">
                <div className="w-20 h-20 rounded-full bg-border/50 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-border" />
                </div>
                <span className="absolute top-3 right-3 bg-card/90 text-xs text-secondary-custom px-2 py-1 rounded-full">
                  {model.subject}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-[15px] font-semibold text-primary-custom">{model.name}</h3>
                <p className="text-xs text-tertiary-custom mt-1">
                  {model.date} · {model.steps} steps · {model.duration}
                </p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-accent-foreground text-sm font-medium py-2 rounded-lg hover:opacity-90 transition-opacity">
                    <Play size={14} strokeWidth={1.5} /> Resume
                  </button>
                  <button className="p-2 border border-border rounded-lg text-tertiary-custom hover:text-destructive hover:border-destructive transition-colors">
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
