import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { BarChart3, Upload, Database, Layers, Search, MoreHorizontal, Plus, CloudUpload, Check, X } from "lucide-react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";

const adminNavItems = [
  { icon: Database, label: "Models", path: "/admin" },
  { icon: Upload, label: "Upload", path: "/admin/upload" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Layers, label: "Cache", path: "/admin/cache" },
];

const mockModels = [
  { id: 1, name: "Human Heart", subject: "Biology", tier: 1, viral: 95, status: "Published" },
  { id: 2, name: "DNA Double Helix", subject: "Biology", tier: 1, viral: 92, status: "Published" },
  { id: 3, name: "Solar System", subject: "Astronomy", tier: 1, viral: 97, status: "Published" },
  { id: 4, name: "Car Engine V8", subject: "Engineering", tier: 2, viral: 78, status: "Draft" },
  { id: 5, name: "Water Molecule", subject: "Chemistry", tier: 3, viral: 45, status: "Published" },
];

const subjectColors: Record<string, string> = {
  Biology: "bg-green-50 text-green-700",
  Physics: "bg-blue-50 text-blue-700",
  Chemistry: "bg-purple-50 text-purple-700",
  Astronomy: "bg-indigo-50 text-indigo-700",
  Engineering: "bg-orange-50 text-orange-700",
};

export default function Admin() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <MainLayout title="Admin Panel">
      <div className="flex h-full">
        {/* Admin sub-nav */}
        <div className="hidden md:block w-48 bg-background-secondary border-r border-border p-3 space-y-1">
          <p className="label-text text-tertiary-custom px-3 mb-2">Admin</p>
          {adminNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                location.pathname === item.path
                  ? "bg-accent-subtle text-accent font-medium"
                  : "text-secondary-custom hover:bg-border-subtle"
              }`}
            >
              <item.icon size={16} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 md:pb-8">
          {location.pathname === "/admin/upload" ? <UploadView /> : <ModelsTable />}
        </div>
      </div>
    </MainLayout>
  );
}

function ModelsTable() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-primary-custom">Models</h1>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.97]">
          <Plus size={16} strokeWidth={1.5} /> Upload Model
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-background-secondary">
                {["Name", "Subject", "Tier", "Viral Score", "Status", "Actions"].map((h) => (
                  <th key={h} className="label-text text-tertiary-custom text-left px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockModels.map((model) => (
                <tr key={model.id} className="border-t border-border hover:bg-background-secondary transition-colors h-[52px]">
                  <td className="px-4 text-sm font-medium text-primary-custom">{model.name}</td>
                  <td className="px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${subjectColors[model.subject] || "bg-muted text-secondary-custom"}`}>
                      {model.subject}
                    </span>
                  </td>
                  <td className="px-4 text-sm text-secondary-custom">Tier {model.tier}</td>
                  <td className="px-4 text-sm text-secondary-custom">{model.viral}</td>
                  <td className="px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      model.status === "Published"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {model.status}
                    </span>
                  </td>
                  <td className="px-4">
                    <button className="p-1 hover:bg-border rounded transition-colors">
                      <MoreHorizontal size={16} strokeWidth={1.5} className="text-tertiary-custom" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UploadView() {
  const [uploaded, setUploaded] = useState(false);
  const [chips, setChips] = useState<string[]>(["heart", "cardiac", "ventricle"]);
  const [chipInput, setChipInput] = useState("");

  const addChip = () => {
    if (chipInput.trim() && !chips.includes(chipInput.trim())) {
      setChips([...chips, chipInput.trim()]);
      setChipInput("");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-primary-custom mb-6">Upload Model</h1>

      {/* Upload zone */}
      <div
        onClick={() => setUploaded(true)}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors duration-150 ${
          uploaded ? "border-accent bg-accent-subtle" : "border-border hover:border-accent"
        }`}
      >
        {uploaded ? (
          <div className="flex flex-col items-center">
            <Check size={32} strokeWidth={1.5} className="text-accent mb-2" />
            <p className="text-sm font-medium text-primary-custom">heart_model.glb</p>
            <p className="text-xs text-tertiary-custom mt-1">4.2 MB uploaded</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <CloudUpload size={32} strokeWidth={1.5} className="text-tertiary-custom mb-2" />
            <p className="text-sm text-secondary-custom">Drop your 3D model here or click to browse</p>
            <p className="text-xs text-tertiary-custom mt-1">GLB, GLTF, FBX, OBJ — Max 50MB</p>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="mt-8 space-y-5">
        <FormField label="Model Name" placeholder="e.g. Human Heart" />
        <FormField label="Slug" placeholder="human_heart" value="human_heart" disabled />

        <div>
          <label className="text-[13px] font-medium text-primary-custom block mb-1.5">Subject</label>
          <select className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm text-primary-custom focus:outline-none focus:border-primary transition-colors">
            {["Biology", "Physics", "Chemistry", "Mathematics", "Geography", "Astronomy", "Engineering", "Vehicles"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tier" placeholder="1" type="number" />
          <FormField label="Viral Score" placeholder="95" type="number" />
        </div>

        {/* Keywords with chips */}
        <div>
          <label className="text-[13px] font-medium text-primary-custom block mb-1.5">English Keywords</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {chips.map((c) => (
              <span key={c} className="bg-accent-subtle text-accent text-xs px-2 py-1 rounded flex items-center gap-1">
                {c}
                <X size={12} strokeWidth={1.5} className="cursor-pointer" onClick={() => setChips(chips.filter((x) => x !== c))} />
              </span>
            ))}
          </div>
          <input
            value={chipInput}
            onChange={(e) => setChipInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip())}
            placeholder="Add keyword and press Enter"
            className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-tertiary-custom mt-1">Comma-separated search terms students might use</p>
        </div>

        <FormField label="Hindi Keywords" placeholder="हृदय, दिल, हृदय कैसे काम करता है" />
        <FormField label="Named Parts" placeholder="left_ventricle, right_ventricle, aorta, pulmonary_artery" />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-secondary-custom hover:bg-background-secondary transition-colors">
            Save as Draft
          </button>
          <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.97]">
            Publish Model
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  value,
  disabled,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium text-primary-custom block mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        disabled={disabled}
        className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm text-primary-custom placeholder:text-tertiary-custom focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
      />
    </div>
  );
}
