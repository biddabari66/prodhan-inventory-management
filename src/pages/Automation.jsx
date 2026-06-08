import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Webhook as WebhookIcon,
  Plus,
  Edit,
  Trash2,
  Send,
  Info,
  Activity,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const SIGNATURE_HEADER = "X-Bee-Signature";
const EVENT_HEADER = "X-Bee-Event";

const emptyForm = { name: "", url: "", events: [], secret: "", isActive: true };

export default function Automation() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // ---------- queries ----------
  const { data: eventsData } = useQuery({
    queryKey: ["automation-events"],
    queryFn: async () => (await api.get("/automation/events")).data.data,
  });
  const availableEvents = eventsData || [];

  const { data: webhooksData, isLoading: loadingWebhooks } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => (await api.get("/automation/webhooks")).data.data,
  });
  const webhooks = webhooksData || [];

  const { data: deliveriesData, isLoading: loadingDeliveries, refetch: refetchDeliveries } = useQuery({
    queryKey: ["webhook-deliveries"],
    queryFn: async () => (await api.get("/automation/webhooks/deliveries")).data.data,
  });
  const deliveries = deliveriesData || [];

  // ---------- mutations ----------
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) return (await api.patch(`/automation/webhooks/${editingId}`, payload)).data;
      return (await api.post("/automation/webhooks", payload)).data;
    },
    onSuccess: () => {
      toast.success(editingId ? "Webhook updated" : "Webhook created");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      closeDialog();
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Failed to save webhook"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) =>
      (await api.patch(`/automation/webhooks/${id}`, { isActive })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
    onError: (e) => toast.error(e?.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await api.delete(`/automation/webhooks/${id}`)).data,
    onSuccess: () => {
      toast.success("Webhook deleted");
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Failed to delete"),
  });

  const testMutation = useMutation({
    mutationFn: async (id) => (await api.post(`/automation/webhooks/${id}/test`)).data,
    onSuccess: (res) => {
      if (res.ok) toast.success(`Test delivered (HTTP ${res.responseCode})`);
      else toast.error(`Test failed (HTTP ${res.responseCode ?? "—"})`);
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || "Test failed"),
  });

  // ---------- handlers ----------
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (wh) => {
    setEditingId(wh.id);
    setForm({ name: wh.name, url: wh.url, events: wh.events || [], secret: "", isActive: wh.isActive });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.url.trim()) return toast.error("URL is required");
    if (!form.events.length) return toast.error("Select at least one event");
    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      events: form.events,
      isActive: form.isActive,
    };
    if (form.secret.trim()) payload.secret = form.secret.trim();
    saveMutation.mutate(payload);
  };

  const eventOptions = availableEvents.map((e) => ({ value: e, label: e }));

  const statusVariant = (status) =>
    status === "success" ? "default" : status === "failed" ? "destructive" : "secondary";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WebhookIcon className="h-6 w-6" /> Automation &amp; Webhooks
          </h1>
          <p className="text-muted-foreground text-sm">
            Connect ZYPRA ERP to n8n, Zapier, or any HTTP endpoint to automate your workflows.
          </p>
        </div>
      </div>

      {/* Info panel */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6 flex gap-3 text-sm">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-blue-900">Automate anything with n8n</p>
            <p className="text-blue-800">
              In n8n, add a <span className="font-semibold">Webhook</span> node, copy its
              {" "}<span className="font-semibold">Production URL</span>, and paste it as a webhook below.
              Pick the events you care about and Bee will POST a JSON payload to your flow in real time.
            </p>
            <p className="text-blue-800">
              Each request is signed with header{" "}
              <code className="px-1 py-0.5 rounded bg-blue-100 font-mono text-xs">{SIGNATURE_HEADER}</code>{" "}
              (<code className="font-mono text-xs">sha256=&lt;HMAC&gt;</code> of the body using your secret),
              and the event name is in{" "}
              <code className="px-1 py-0.5 rounded bg-blue-100 font-mono text-xs">{EVENT_HEADER}</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* ---------- Webhooks ---------- */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Webhook
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingWebhooks ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : webhooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No webhooks yet. Click "Add Webhook" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhooks.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-medium">{wh.name}</TableCell>
                        <TableCell className="max-w-[220px] truncate font-mono text-xs">{wh.url}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {(wh.events || []).map((e) => (
                              <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{wh.secretMasked}</TableCell>
                        <TableCell>
                          <Switch
                            checked={wh.isActive}
                            onCheckedChange={(v) => toggleMutation.mutate({ id: wh.id, isActive: v })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testMutation.mutate(wh.id)}
                              disabled={testMutation.isPending}
                            >
                              <Send className="h-3.5 w-3.5 mr-1" /> Test
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(wh)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Delete this webhook?")) deleteMutation.mutate(wh.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Logs ---------- */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" /> Last 100 deliveries
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchDeliveries()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDeliveries ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                    </TableRow>
                  ) : deliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No deliveries recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveries.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.event}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                        </TableCell>
                        <TableCell>{d.responseCode ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(d.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- Add/Edit dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. n8n Order Flow"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webhook URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://your-n8n.app/webhook/abc123"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Events</Label>
              <MultiSelect
                options={eventOptions}
                selected={form.events}
                onChange={(events) => setForm({ ...form, events })}
                placeholder="Select events…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Custom Secret (optional)</Label>
              <Input
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder={editingId ? "Leave blank to keep existing" : "Auto-generated if blank"}
              />
              <p className="text-xs text-muted-foreground">
                Used to sign requests with {SIGNATURE_HEADER}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
