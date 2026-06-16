import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Compass,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Network,
  Plus,
  Trash2,
} from "lucide-react";

import api from "@/api/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INDUSTRIES = [
  "Retail",
  "Wholesale",
  "E-commerce",
  "Manufacturing",
  "Education",
  "Services",
  "Restaurant",
  "Other",
];

const HEAR_ABOUT = [
  "Google Search",
  "Facebook",
  "Instagram",
  "Friend/Referral",
  "YouTube",
  "Event",
  "Other",
];

const EMPLOYEE_OPTIONS = [
  { value: "1-10", label: "1-10", hint: "Just getting started" },
  { value: "11-50", label: "11-50", hint: "Growing team" },
  { value: "51-200", label: "51-200", hint: "Established business" },
  { value: "200+", label: "200+", hint: "Enterprise" },
];

const STEPS = [
  { title: "Company", icon: Building2 },
  { title: "Size", icon: Users },
  { title: "Discovery", icon: Compass },
  { title: "Your Companies", icon: Network },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Sub-companies created during onboarding
  const [subCompanyName, setSubCompanyName] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [companies, setCompanies] = useState([]); // [{ id, name }]
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    employeeCount: "",
    country: "Bangladesh",
    hearAboutUs: "",
    website: "",
    phone: "",
    address: "",
  });

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const progress = ((step + 1) / STEPS.length) * 100;

  function validateStep() {
    if (step === 0) {
      if (!form.companyName.trim()) {
        toast.error("Please enter your company name.");
        return false;
      }
      if (!form.industry) {
        toast.error("Please select your industry.");
        return false;
      }
    }
    if (step === 1) {
      if (!form.employeeCount) {
        toast.error("Please select your team size.");
        return false;
      }
      if (!form.country.trim()) {
        toast.error("Please enter your country.");
        return false;
      }
    }
    if (step === 2) {
      if (!form.hearAboutUs) {
        toast.error("Please tell us how you heard about us.");
        return false;
      }
    }
    return true;
  }

  async function handleAddCompany() {
    const name = subCompanyName.trim();
    if (!name) {
      toast.error("Please enter a company name.");
      return;
    }
    if (companies.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("You already added that company.");
      return;
    }
    setAddingCompany(true);
    try {
      const res = await api.post("/companies", { name, branding: {} });
      const created = res?.data?.data ?? res?.data ?? {};
      setCompanies((prev) => [...prev, { id: created.id, name: created.name || name }]);
      setSubCompanyName("");
      toast.success(`Added "${name}" 🐝`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Couldn't add that company. Please try again.";
      toast.error(msg);
    } finally {
      setAddingCompany(false);
    }
  }

  function handleRemoveCompany(id) {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleFinish() {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await api.post("/onboarding", {
        companyName: form.companyName.trim(),
        industry: form.industry,
        employeeCount: form.employeeCount,
        hearAboutUs: form.hearAboutUs,
        country: form.country.trim(),
        website: form.website.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      // Set the first created sub-company as the active company.
      if (companies.length > 0 && companies[0].id) {
        localStorage.setItem("activeCompanyId", companies[0].id);
        localStorage.setItem("activeCompany", companies[0].name);
      }

      toast.success("Welcome to ZYPRA ERP! 🐝");
      window.location.href = "/";
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Something went wrong saving your details. Please try again.";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-background to-yellow-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-amber-100 overflow-hidden">
        {/* Gradient header */}
        <CardHeader className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white p-8 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-wider text-white/80">
              🐝 Welcome aboard
            </p>
            <h1 className="text-2xl font-bold">Let's set up ZYPRA ERP</h1>
            <p className="text-white/90 text-sm">
              A few quick questions so we can tailor your workspace.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between pt-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.title} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                      done
                        ? "bg-white text-amber-600 border-white"
                        : active
                        ? "bg-white/20 text-white border-white"
                        : "bg-transparent text-white/60 border-white/40",
                    ].join(" ")}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={[
                      "text-xs font-medium",
                      active || done ? "text-white" : "text-white/60",
                    ].join(" ")}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>

          <Progress value={progress} className="h-2 bg-white/30" />
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Company name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="e.g. Acme Trading Co."
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Industry <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.industry}
                  onValueChange={(v) => update("industry", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <Label>
                  How many people are on your team?{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {EMPLOYEE_OPTIONS.map((opt) => {
                    const selected = form.employeeCount === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update("employeeCount", opt.value)}
                        className={[
                          "rounded-lg border-2 p-4 text-left transition-all",
                          selected
                            ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                            : "border-input hover:border-amber-300 hover:bg-amber-50/50",
                        ].join(" ")}
                      >
                        <span className="block text-lg font-semibold">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="country"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>
                  How did you hear about us?{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.hearAboutUs}
                  onValueChange={(v) => update("hearAboutUs", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEAR_ABOUT.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  placeholder="https://yourcompany.com"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  placeholder="+880 1XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Textarea
                  id="address"
                  placeholder="Your business address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-base">
                  <Network className="h-4 w-4 text-amber-500" />
                  Add your sub-companies
                </Label>
                <p className="text-sm text-muted-foreground">
                  {form.companyName.trim() || "Your business"} can have one or
                  more sub-companies (e.g. Prodhan.com). Add them now — you can
                  always add more later.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="e.g. Prodhan.com"
                  value={subCompanyName}
                  onChange={(e) => setSubCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCompany();
                    }
                  }}
                  disabled={addingCompany}
                />
                <Button
                  type="button"
                  onClick={handleAddCompany}
                  disabled={addingCompany || !subCompanyName.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                >
                  {addingCompany ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>

              {companies.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center">
                  <Building2 className="mx-auto mb-2 h-7 w-7 text-amber-400" />
                  <p className="text-sm text-muted-foreground">
                    No sub-companies yet. Add at least one to get started.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {companies.map((c, i) => (
                    <li
                      key={c.id || c.name}
                      className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />
                        <span className="truncate font-medium text-slate-800">
                          {c.name}
                        </span>
                        {i === 0 && (
                          <span className="ml-1 shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Active
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCompany(c.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0 || submitting}
              className={step === 0 ? "invisible" : ""}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {isLastStep ? (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Finish
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
