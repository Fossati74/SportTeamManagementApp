import { useState, useEffect } from "react";
import { supabase, FineType } from "../../lib/supabase";
import { Plus, Trash2, X, Check, Scale } from "lucide-react";
import { logActivity } from "../../lib/activityLog";
import { SectionHeader } from "../common/SectionHeader";
import toast from "react-hot-toast";

interface FineTypeManagerProps {
  onUpdate: () => void;
}

export const FineTypeManager = ({ onUpdate }: FineTypeManagerProps) => {
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [sanction, setSanction] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFineTypes();
  }, []);

  const fetchFineTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("fine_types")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setFineTypes(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("fine_types").insert({
        name,
        amount: parseFloat(amount),
        sanction: sanction || null,
      });
      if (error) throw error;
      await logActivity("fine_type_added", `Type d'amende "${name}" ajouté`);
      setName("");
      setAmount("");
      setSanction("");
      setShowAddForm(false);
      fetchFineTypes();
      onUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce type ?")) return;
    try {
      await supabase.from("fine_types").delete().eq("id", id);
      fetchFineTypes();
      onUpdate();
      toast.success("Type d'amende supprimé !", {
        style: {
          background: "#1e293b",
          color: "#fff",
          border: "1px solid #334155",
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
      <SectionHeader title="Types d'amendes" Icon={Scale}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`p-2 rounded-xl transition-all ${showAddForm ? "bg-slate-700 text-white" : "bg-green-600/20 text-green-400 hover:bg-green-600/30"}`}
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
        </button>
      </SectionHeader>
      <div className="p-6">
        {showAddForm && (
          <form
            onSubmit={handleAdd}
            className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-3"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-green-500"
              required
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="€"
                className="w-1/3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-green-500"
                required
              />
              <input
                type="text"
                value={sanction}
                onChange={(e) => setSanction(e.target.value)}
                placeholder="Sanction..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <Check size={16} /> Valider
            </button>
          </form>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {fineTypes.map((type) => (
            <div
              key={type.id}
              className="flex justify-between items-center p-3 bg-slate-900/40 rounded-xl border border-slate-700/50 group hover:border-slate-500"
            >
              <div>
                <p className="text-white text-sm font-medium">{type.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-red-400 text-xs font-bold">
                    {type.amount}€
                  </span>
                  {type.sanction && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase">
                      • {type.sanction}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(type.id)}
                className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
