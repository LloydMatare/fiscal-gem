"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  tradeName: string | null;
  tin: string | null;
  vatNumber: string | null;
  phone: string | null;
  email: string | null;
  province: string | null;
  city: string | null;
  street: string | null;
  houseNo: string | null;
  district: string | null;
  notes: string | null;
}

const emptyForm = {
  name: "", tradeName: "", tin: "", vatNumber: "", phone: "", email: "",
  province: "", city: "", street: "", houseNo: "", district: "", notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function fetchCustomers(q = "") {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/customers?limit=100${q ? `&search=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setCustomers(data.data || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchCustomers(); }, []);

  function handleSearch() { fetchCustomers(search); }

  function openAdd() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name || "", tradeName: c.tradeName || "", tin: c.tin || "",
      vatNumber: c.vatNumber || "", phone: c.phone || "", email: c.email || "",
      province: c.province || "", city: c.city || "", street: c.street || "",
      houseNo: c.houseNo || "", district: c.district || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `/api/tenant/customers/${editing.id}` : "/api/tenant/customers";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDialogOpen(false);
      fetchCustomers(search);
    } catch {} finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return;
    try {
      await fetch(`/api/tenant/customers/${id}`, { method: "DELETE" });
      fetchCustomers(search);
    } catch {}
  }

  return (
    <div>
      <PageHeader title="Customers" description="Manage your buyer profiles">
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Customer
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Trade Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">TIN</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No customers yet</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{c.tradeName || "—"}</td>
                <td className="px-4 py-3 text-sm">{c.tin || "—"}</td>
                <td className="px-4 py-3 text-sm">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-sm">{c.email || "—"}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Trade Name</label>
                <Input placeholder="Business name" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">TIN</label>
                <Input placeholder="Tax ID number" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">VAT Number</label>
                <Input placeholder="VAT registration" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                <Input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Address</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                <Input placeholder="House No" value={form.houseNo} onChange={(e) => setForm({ ...form, houseNo: e.target.value })} />
                <Input placeholder="District" className="md:col-span-2" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
