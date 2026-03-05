import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, CreditCard, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export interface PaymentFlowState {
  listingId: string;
  listingTitle: string;
  teacherId: string;
  teacherName: string;
  priceId: string;
  price: number;
  durationMinutes: number;
  consultationType: "video" | "messaging" | "product";
  quantity: number;
  startTs?: string;
  endTs?: string;
  selectedDate?: string;
  selectedTime?: string;
}

export default function PaymentMethodPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const flowState = location.state as PaymentFlowState | null;

  if (!flowState) {
    navigate("/", { replace: true });
    return null;
  }

  const isProduct = flowState.consultationType === "product";
  const totalAmount = flowState.price * flowState.quantity;

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
        {/* Left: Order Summary */}
        <Card className="border-border/50">
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

        {/* Right: Payment Method Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ödeme Yöntemi</h2>

          {/* Bank Transfer - Active */}
          <Card
            className="border-2 border-primary/40 cursor-pointer hover:border-primary transition-colors"
            onClick={() =>
              navigate("/payment/bank-transfer", { state: flowState })
            }
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Havale / EFT ile Öde</p>
                <p className="text-sm text-muted-foreground">
                  Banka hesabına havale yaparak ödeyin
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card - Disabled Placeholder */}
          <Card className="border border-border/30 opacity-50 cursor-not-allowed">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-muted">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-muted-foreground">Kart ile Öde</p>
                  <Badge variant="secondary" className="text-xs">Yakında</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Kredi/banka kartı ile ödeme
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
