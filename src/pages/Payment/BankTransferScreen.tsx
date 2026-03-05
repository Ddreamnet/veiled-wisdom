import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, Building2, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CopyableField } from "@/components/CopyableField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PaymentFlowState } from "./PaymentMethodPage";
import type { BankAccount } from "@/types/database";

export default function BankTransferScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const flowState = location.state as PaymentFlowState | null;
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!flowState) {
      navigate("/", { replace: true });
      return;
    }
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (error) {
      toast({ title: "Hata", description: "Banka bilgileri yüklenemedi.", variant: "destructive" });
      setLoading(false);
      return;
    }
    setBanks(data || []);
    if (data && data.length > 0) setSelectedBank(data[0]);
    setLoading(false);
  };

  if (!flowState || !user) return null;

  const isProduct = flowState.consultationType === "product";
  const totalAmount = flowState.price * flowState.quantity;

  // Placeholder reference code shown before submission (actual code from server)
  const tempRefDisplay = "Ödeme sonrası oluşturulacak";

  const handleConfirmPayment = async () => {
    if (!selectedBank) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("create_payment_request_and_appointment", {
        _customer_id: user.id,
        _teacher_id: flowState.teacherId,
        _listing_id: flowState.listingId,
        _listing_price_id: flowState.priceId,
        _item_type: flowState.consultationType === "product" ? "product" : "appointment",
        _quantity: flowState.quantity,
        _amount: totalAmount,
        _bank_account_id: selectedBank.id,
        _start_ts: flowState.startTs || null,
        _end_ts: flowState.endTs || null,
        _duration_minutes: flowState.consultationType === "product" ? null : flowState.durationMinutes,
      });

      if (error) throw error;

      toast({
        title: "Ödeme Bildirimi Gönderildi",
        description: `Referans kodunuz: ${data?.reference_code}. Ödemeniz kontrol ediliyor.`,
      });

      navigate("/appointments", { replace: true });
    } catch (err: any) {
      console.error("Payment request error:", err);
      toast({
        title: "Hata",
        description: err.message || "Ödeme bildirimi oluşturulamadı.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container px-4 md:px-6 py-8 md:py-12 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri Dön
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Order Summary */}
        <Card className="border-border/50 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Sipariş Özeti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-foreground">{flowState.listingTitle}</p>
              <p className="text-sm text-muted-foreground">Uzman: {flowState.teacherName}</p>
            </div>

            {!isProduct && flowState.selectedDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(new Date(flowState.selectedDate), "dd MMMM yyyy", { locale: tr })}
                  {flowState.selectedTime && ` — ${flowState.selectedTime}`}
                </span>
              </div>
            )}

            {!isProduct && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{flowState.durationMinutes} dakika</span>
              </div>
            )}

            {isProduct && flowState.quantity > 1 && (
              <p className="text-sm text-muted-foreground">
                {flowState.quantity} adet × {flowState.price} TL
              </p>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Toplam</span>
                <span className="text-primary">{totalAmount} TL</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Bank Selection + Transfer Details */}
        <div className="space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Havale Bilgileri
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Bank Selection Tabs */}
              <div className="flex gap-2">
                {banks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      selectedBank?.id === bank.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {bank.bank_name}
                  </button>
                ))}
              </div>

              {/* Transfer Details */}
              {selectedBank && (
                <div className="space-y-3">
                  <CopyableField label="IBAN" value={selectedBank.iban} />
                  <CopyableField label="Alıcı Adı" value={selectedBank.account_holder} />
                  <CopyableField label="Tutar" value={`${totalAmount} TL`} />

                  <div className="bg-destructive/10 border-l-4 border-destructive rounded-r-lg p-4">
                    <p className="text-sm text-foreground/80">
                      ⚠️ Havale açıklamasına referans kodunuzu yazmayı unutmayın. Referans kodu ödeme onayından sonra gösterilecektir.
                    </p>
                  </div>
                </div>
              )}

              {/* Sticky CTA */}
              <div className="pt-2 md:pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                      disabled={!selectedBank || submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          İşleniyor...
                        </>
                      ) : (
                        "Ödemeyi Yaptım"
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ödeme Onayı</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        Havale işlemini yaptığınıza emin misiniz? Onayladıktan sonra ödemeniz kontrol edilecektir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={submitting}>İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmPayment} disabled={submitting}>
                        {submitting ? "İşleniyor..." : "Evet, Ödemeyi Yaptım"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
