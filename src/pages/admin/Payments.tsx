import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Loader2, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import { UnifiedBreadcrumb as AdminBreadcrumb } from "@/components/UnifiedBreadcrumb";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

type PaymentRequestRow = {
  id: string;
  customer_id: string;
  teacher_id: string;
  listing_id: string;
  listing_price_id: string;
  item_type: string;
  quantity: number;
  amount: number;
  bank_account_id: string | null;
  reference_code: string;
  status: string;
  admin_note: string | null;
  confirmed_at: string | null;
  created_at: string;
  start_ts: string | null;
  end_ts: string | null;
  duration_minutes: number | null;
  customer: { username: string } | null;
  teacher: { username: string } | null;
  listing: { title: string } | null;
  bank_account: { bank_name: string } | null;
};

export default function AdminPayments() {
  const [requests, setRequests] = useState<PaymentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequestRow | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobileLayout();

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("payment_requests")
        .select(`
          *,
          customer:profiles!payment_requests_customer_id_fkey(username),
          teacher:profiles!payment_requests_teacher_id_fkey(username),
          listing:listings!payment_requests_listing_id_fkey(title),
          bank_account:bank_accounts!payment_requests_bank_account_id_fkey(bank_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("item_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error fetching payment requests:", err);
      toast({ title: "Hata", description: "Ödeme talepleri yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pr: PaymentRequestRow) => {
    setActionLoading(pr.id);
    try {
      // 1. Idempotent update: only pending → confirmed
      const { data: updated, error: updateError } = await supabase
        .from("payment_requests")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", pr.id)
        .eq("status", "pending")
        .select();

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) {
        toast({ title: "Bilgi", description: "Bu talep zaten işlenmiş." });
        fetchRequests();
        return;
      }

      // 2. Update appointment status if appointment type
      if (pr.item_type === "appointment") {
        const { data: apptUpdated, error: apptError } = await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("payment_request_id", pr.id)
          .select();

        if (apptError) {
          console.error("Appointment update error:", apptError);
          toast({ title: "Uyarı", description: "Randevu durumu güncellenemedi: " + apptError.message, variant: "destructive" });
        } else if (!apptUpdated || apptUpdated.length === 0) {
          console.warn("No appointment found for payment_request_id:", pr.id);
        }
      }

      // 3. Create order if product type
      let sourceId = pr.id; // fallback
      if (pr.item_type === "product") {
        const { data: orderData } = await supabase
          .from("orders")
          .insert({
            payment_request_id: pr.id,
            customer_id: pr.customer_id,
            teacher_id: pr.teacher_id,
            listing_id: pr.listing_id,
            quantity: pr.quantity,
            total_amount: pr.amount,
            status: "confirmed",
          })
          .select("id")
          .single();
        if (orderData) sourceId = orderData.id;
      } else {
        // Get appointment id
        const { data: aptData } = await supabase
          .from("appointments")
          .select("id")
          .eq("payment_request_id", pr.id)
          .single();
        if (aptData) sourceId = aptData.id;
      }

      // 4. Insert earnings_ledger (ON CONFLICT → do nothing via upsert check)
      const teacherAmount = pr.amount * (1 - PLATFORM_COMMISSION_RATE);
      const platformAmount = pr.amount * PLATFORM_COMMISSION_RATE;

      const { error: ledgerError } = await supabase.from("earnings_ledger").upsert({
        payment_request_id: pr.id,
        teacher_id: pr.teacher_id,
        source_type: pr.item_type,
        source_id: sourceId,
        gross_amount: pr.amount,
        teacher_amount: teacherAmount,
        platform_amount: platformAmount,
      }, { onConflict: "payment_request_id", ignoreDuplicates: true });
      if (ledgerError) console.error("Ledger insert error (may be duplicate):", ledgerError);

      // 5. Send email notification
      try {
        await supabase.functions.invoke("send-status-update-email", {
          body: {
            customerUserId: pr.customer_id,
            customerName: pr.customer?.username || "Kullanıcı",
            teacherName: pr.teacher?.username || "Uzman",
            listingTitle: pr.listing?.title || "İlan",
            startTime: pr.start_ts || new Date().toISOString(),
            duration: pr.duration_minutes || 0,
            price: pr.amount,
            status: "confirmed",
          },
        });
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }

      toast({ title: "Onaylandı", description: `Ödeme #${pr.reference_code} onaylandı.` });
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setSelectedRequest(null);
    }
  };

  const handleReject = async (pr: PaymentRequestRow) => {
    setActionLoading(pr.id);
    try {
      const { data: updated, error } = await supabase
        .from("payment_requests")
        .update({ status: "rejected", admin_note: rejectNote || null })
        .eq("id", pr.id)
        .eq("status", "pending")
        .select();

      if (error) throw error;
      if (!updated || updated.length === 0) {
        toast({ title: "Bilgi", description: "Bu talep zaten işlenmiş." });
        fetchRequests();
        return;
      }

      // Cancel appointment if exists
      if (pr.item_type === "appointment") {
        const { data: apptUpdated, error: apptError } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("payment_request_id", pr.id)
          .select();

        if (apptError) {
          console.error("Appointment cancel error:", apptError);
          toast({ title: "Uyarı", description: "Randevu durumu güncellenemedi: " + apptError.message, variant: "destructive" });
        } else if (!apptUpdated || apptUpdated.length === 0) {
          console.warn("No appointment found for payment_request_id:", pr.id);
        }
      }

      // Send rejection email
      try {
        await supabase.functions.invoke("send-status-update-email", {
          body: {
            customerUserId: pr.customer_id,
            customerName: pr.customer?.username || "Kullanıcı",
            teacherName: pr.teacher?.username || "Uzman",
            listingTitle: pr.listing?.title || "İlan",
            startTime: pr.start_ts || new Date().toISOString(),
            duration: pr.duration_minutes || 0,
            price: pr.amount,
            status: "cancelled",
          },
        });
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }

      toast({ title: "Reddedildi", description: `Ödeme #${pr.reference_code} reddedildi.` });
      setRejectNote("");
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setSelectedRequest(null);
    }
  };

  const filteredRequests = searchQuery
    ? requests.filter(
        (r) =>
          r.reference_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.teacher?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requests;

  const statusCounts = {
    pending: requests.filter((r) => r.status === "pending").length,
    confirmed: requests.filter((r) => r.status === "confirmed").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const renderRequestCard = (pr: PaymentRequestRow) => (
    <Card key={pr.id} className="mb-3">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{pr.listing?.title || "İlan"}</p>
            <p className="text-xs text-muted-foreground">#{pr.reference_code}</p>
          </div>
          <Badge
            variant={
              pr.status === "confirmed" ? "default" : pr.status === "rejected" ? "destructive" : "outline"
            }
          >
            {pr.status === "pending" ? "Bekliyor" : pr.status === "confirmed" ? "Onaylandı" : "Reddedildi"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Danışan: {pr.customer?.username}</p>
          <p>Uzman: {pr.teacher?.username}</p>
          <p>Banka: {pr.bank_account?.bank_name || "-"}</p>
          <p>Tutar: {pr.amount} TL</p>
          <p>Tip: {pr.item_type === "appointment" ? "Randevu" : "Ürün"}</p>
          <p>Tarih: {format(new Date(pr.created_at), "dd MMM yyyy HH:mm", { locale: tr })}</p>
        </div>
        {pr.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleApprove(pr)}
              disabled={actionLoading === pr.id}
            >
              {actionLoading === pr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Onayla
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="flex-1" disabled={actionLoading === pr.id}>
                  <X className="h-3 w-3 mr-1" />
                  Reddet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ödeme Reddi</AlertDialogTitle>
                  <AlertDialogDescription>
                    #{pr.reference_code} referans kodlu ödemeyi reddetmek istediğinize emin misiniz?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Red sebebi (opsiyonel)"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="my-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleReject(pr)}>Reddet</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderRequestRow = (pr: PaymentRequestRow) => (
    <TableRow key={pr.id}>
      <TableCell className="font-mono text-xs">{pr.reference_code}</TableCell>
      <TableCell>{pr.customer?.username || "-"}</TableCell>
      <TableCell>{pr.teacher?.username || "-"}</TableCell>
      <TableCell className="max-w-[150px] truncate">{pr.listing?.title || "-"}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {pr.item_type === "appointment" ? "Randevu" : "Ürün"}
        </Badge>
      </TableCell>
      <TableCell>{pr.bank_account?.bank_name || "-"}</TableCell>
      <TableCell className="font-medium">{pr.amount} TL</TableCell>
      <TableCell className="text-xs">{format(new Date(pr.created_at), "dd MMM HH:mm", { locale: tr })}</TableCell>
      <TableCell>
        {pr.status === "pending" ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApprove(pr)}
              disabled={actionLoading === pr.id}
            >
              {actionLoading === pr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={actionLoading === pr.id}>
                  <X className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ödeme Reddi</AlertDialogTitle>
                  <AlertDialogDescription>
                    #{pr.reference_code} referans kodlu ödemeyi reddetmek istediğinize emin misiniz?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  placeholder="Red sebebi (opsiyonel)"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="my-2"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleReject(pr)}>Reddet</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <Badge
            variant={pr.status === "confirmed" ? "default" : "destructive"}
          >
            {pr.status === "confirmed" ? "Onaylandı" : "Reddedildi"}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-6">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Ödeme Onayları</h1>
          <p className="text-muted-foreground mt-1">Havale ile yapılan ödemeleri kontrol edin</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Referans kodu veya isim ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="appointment">Randevu</SelectItem>
            <SelectItem value="product">Ürün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="pending">Bekleyen ({statusCounts.pending})</TabsTrigger>
          <TabsTrigger value="confirmed">Onaylanan ({statusCounts.confirmed})</TabsTrigger>
          <TabsTrigger value="rejected">Reddedilen ({statusCounts.rejected})</TabsTrigger>
          <TabsTrigger value="all">Tümü</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Ödeme talebi bulunamadı.</p>
          ) : isMobile ? (
            <div>{filteredRequests.map(renderRequestCard)}</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referans</TableHead>
                      <TableHead>Danışan</TableHead>
                      <TableHead>Uzman</TableHead>
                      <TableHead>İlan</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Banka</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{filteredRequests.map(renderRequestRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
