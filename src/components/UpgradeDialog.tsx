import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Zap, Upload, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeDialog({ open, onOpenChange }: UpgradeDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"info" | "upload">("info");
  const [qrData, setQrData] = useState<{ esewa_qr_url?: string; khalti_qr_url?: string; manual_instructions?: string } | null>(null);
  const [pricing, setPricing] = useState<{ launch_price: number; regular_price: number; currency: string }>({ launch_price: 99, regular_price: 299, currency: "NPR" });
  const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti">("esewa");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadSettings = async () => {
      const { data: qr } = await supabase.from("site_settings").select("value").eq("key", "payment_qr").maybeSingle();
      const { data: price } = await supabase.from("site_settings").select("value").eq("key", "pricing").maybeSingle();
      if (qr?.value) setQrData(qr.value as any);
      if (price?.value) setPricing(price.value as any);
    };
    loadSettings();
    setStep("info");
    setSubmitted(false);
  }, [open]);

  const handleScreenshotUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("payment-screenshots").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("payment-screenshots").getPublicUrl(path);

      const { error: insertErr } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        amount: pricing.launch_price,
        currency: pricing.currency,
        payment_method: paymentMethod,
        screenshot_url: urlData.publicUrl,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      setSubmitted(true);
      toast.success("Payment submitted! Admin will verify within 24 hours.");
    } catch (err) {
      toast.error("Upload failed. Please try again.");
      console.error(err);
    }
    setUploading(false);
  };

  const features = [
    "15 3D generations per month",
    "D2 Enhanced AI models",
    "HD textures & detail",
    "8-step deep breakdowns",
    "Priority generation speed",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary-custom">
            <Crown size={18} className="text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check size={32} className="text-green-500" />
            </div>
            <h3 className="text-[16px] font-bold text-primary-custom">Payment Submitted!</h3>
            <p className="text-[12px] text-secondary-custom text-center max-w-xs">
              Our team will verify your payment within 24 hours. You'll be upgraded to Pro automatically.
            </p>
            <button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-[12px] font-bold press">
              Got it
            </button>
          </div>
        ) : step === "info" ? (
          <div className="space-y-4">
            {/* Pricing */}
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-[28px] font-black text-primary-custom">{pricing.currency} {pricing.launch_price}</span>
                <span className="text-[12px] text-tertiary-custom">/month</span>
              </div>
              {pricing.launch_price < pricing.regular_price && (
                <p className="text-[10px] text-tertiary-custom mt-1">
                  Launch offer! Regular price: <span className="line-through">{pricing.currency} {pricing.regular_price}</span>
                </p>
              )}
            </div>

            {/* Features */}
            <div className="space-y-2">
              {features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Zap size={12} className="text-yellow-500 shrink-0" />
                  <span className="text-[12px] text-secondary-custom">{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("upload")}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-[13px] font-bold press hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Crown size={14} /> Pay & Upgrade
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment method selector */}
            <div className="flex gap-2">
              {(["esewa", "khalti"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2.5 rounded-lg text-[12px] font-bold border transition-all press ${
                    paymentMethod === m ? "border-primary bg-primary/10 text-primary-custom" : "border-border text-tertiary-custom"
                  }`}
                >
                  {m === "esewa" ? "eSewa" : "Khalti"}
                </button>
              ))}
            </div>

            {/* QR Code */}
            <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center gap-3">
              {(paymentMethod === "esewa" ? qrData?.esewa_qr_url : qrData?.khalti_qr_url) ? (
                <img
                  src={paymentMethod === "esewa" ? qrData!.esewa_qr_url! : qrData!.khalti_qr_url!}
                  alt={`${paymentMethod} QR`}
                  className="w-48 h-48 rounded-lg object-contain bg-white"
                />
              ) : (
                <div className="w-48 h-48 rounded-lg bg-card border border-border flex items-center justify-center">
                  <p className="text-[11px] text-tertiary-custom text-center px-4">QR code not available yet. Contact admin.</p>
                </div>
              )}
              <p className="text-[11px] text-secondary-custom text-center">
                Scan & pay <span className="font-bold text-primary-custom">{pricing.currency} {pricing.launch_price}</span> via {paymentMethod === "esewa" ? "eSewa" : "Khalti"}
              </p>
              {qrData?.manual_instructions && (
                <p className="text-[10px] text-tertiary-custom text-center">{qrData.manual_instructions}</p>
              )}
            </div>

            {/* Screenshot upload */}
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
              uploading ? "border-primary/30 opacity-60" : "border-border hover:border-primary/50"
            }`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleScreenshotUpload(f);
                }}
              />
              {uploading ? (
                <Loader2 size={24} className="text-primary-custom animate-spin mb-2" />
              ) : (
                <Upload size={24} className="text-tertiary-custom mb-2" />
              )}
              <p className="text-[12px] text-secondary-custom font-medium">
                {uploading ? "Uploading..." : "Upload payment screenshot"}
              </p>
              <p className="text-[10px] text-tertiary-custom mt-1">PNG, JPG up to 5MB</p>
            </label>

            <button
              onClick={() => setStep("info")}
              className="w-full py-2 text-[11px] text-tertiary-custom hover:text-secondary-custom transition-colors"
            >
              ← Back to plan details
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
