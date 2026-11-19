/**
 * İşlem e-postaları (React Email). Galeri tasarım dili: kırık beyaz zemin, serif başlık, sade.
 * E-posta istemcileri web fontu desteklemediğinden Georgia/Helvetica yedekleri kullanılır.
 */
import { Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { formatTRY } from "@/lib/money";

const C = { bg: "#f5f3ee", surface: "#ffffff", ink: "#171614", muted: "#666159", line: "#dcd8d0" };
const serif = "Georgia, 'Times New Roman', serif";
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function Layout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return (
    <Html lang="tr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: C.bg, margin: 0, padding: "32px 0", fontFamily: sans, color: C.ink }}>
        <Container style={{ maxWidth: 560, backgroundColor: C.surface, padding: "36px 32px", border: `1px solid ${C.line}` }}>
          <Text style={{ fontFamily: serif, fontSize: 26, margin: 0 }}>
            Hera <span style={{ fontSize: 14, color: C.muted, fontStyle: "italic" }}>İzmir</span>
          </Text>
          <Hr style={{ borderColor: C.line, margin: "20px 0 28px" }} />
          <Text style={{ fontFamily: serif, fontSize: 28, lineHeight: "34px", fontWeight: 300, margin: "0 0 16px" }}>{title}</Text>
          {children}
          <Hr style={{ borderColor: C.line, margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Hera Mağaza · İzmir · Sorularınız için bu e-postayı yanıtlayabilir ya da WhatsApp’tan yazabilirsiniz.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const p = { fontSize: 15, lineHeight: "24px", margin: "0 0 14px" };
const btn = { backgroundColor: C.ink, color: C.bg, padding: "14px 22px", fontSize: 14, textDecoration: "none", display: "inline-block" };

export type EmailOrder = {
  orderNo: string;
  customerName: string;
  totalKurus: number;
  items: Array<{ name: string; quantity: number; priceKurus: number; giftWrap: boolean }>;
  shippingKurus: number;
  discountKurus: number;
  orderUrl: string;
};

function Items({ order }: { order: EmailOrder }) {
  return (
    <Section style={{ border: `1px solid ${C.line}`, padding: "12px 16px", margin: "8px 0 20px" }}>
      {order.items.map((i) => (
        <Text key={i.name} style={{ fontSize: 14, margin: "6px 0" }}>
          <span style={{ fontFamily: serif }}>{i.name}</span>
          {i.quantity > 1 ? ` × ${i.quantity}` : ""}
          {i.giftWrap ? " · hediye paketi" : ""} — {formatTRY(i.priceKurus * i.quantity)}
        </Text>
      ))}
      {order.discountKurus > 0 && <Text style={{ fontSize: 14, margin: "6px 0", color: C.muted }}>İndirim: −{formatTRY(order.discountKurus)}</Text>}
      <Text style={{ fontSize: 14, margin: "6px 0", color: C.muted }}>Kargo: {order.shippingKurus ? formatTRY(order.shippingKurus) : "Ücretsiz"}</Text>
      <Text style={{ fontSize: 15, margin: "10px 0 0", fontWeight: 600 }}>Toplam: {formatTRY(order.totalKurus)}</Text>
    </Section>
  );
}

export function HavaleInstructions({ order, bank }: { order: EmailOrder; bank: { bankName: string; accountHolder: string; iban: string } }) {
  return (
    <Layout preview={`${order.orderNo}: havale bilgileri`} title="Siparişiniz alındı">
      <Text style={p}>Merhaba {order.customerName}, siparişiniz ({order.orderNo}) bize ulaştı. Ödemeniz geldiğinde hediye kutusunda kargoya vereceğiz.</Text>
      <Section style={{ backgroundColor: C.bg, padding: "16px 18px", margin: "8px 0 20px" }}>
        <Text style={{ ...p, margin: "0 0 6px" }}>
          <strong>Tutar:</strong> {formatTRY(order.totalKurus)}
        </Text>
        <Text style={{ ...p, margin: "0 0 6px" }}>
          <strong>Banka:</strong> {bank.bankName || "—"}
        </Text>
        <Text style={{ ...p, margin: "0 0 6px" }}>
          <strong>Alıcı:</strong> {bank.accountHolder || "—"}
        </Text>
        <Text style={{ ...p, margin: "0 0 6px", fontFamily: "monospace" }}>
          <strong style={{ fontFamily: sans }}>IBAN:</strong> {bank.iban.replace(/(.{4})/g, "$1 ").trim() || "—"}
        </Text>
        <Text style={{ ...p, margin: 0 }}>
          <strong>Açıklama:</strong> {order.orderNo}
        </Text>
      </Section>
      <Text style={p}>Lütfen 24 saat içinde ödeyin; aksi halde sipariş iptal edilir ve ürün yeniden satışa açılır.</Text>
      <Items order={order} />
      <Button href={order.orderUrl} style={btn}>
        Siparişi görüntüle
      </Button>
    </Layout>
  );
}

export function PaymentReceived({ order }: { order: EmailOrder }) {
  return (
    <Layout preview={`${order.orderNo}: ödemeniz alındı`} title="Ödemeniz alındı, teşekkürler">
      <Text style={p}>Merhaba {order.customerName}, {order.orderNo} numaralı siparişinizin ödemesi alındı. 1–3 iş günü içinde hediye kutusunda kargoya vereceğiz.</Text>
      <Items order={order} />
      <Button href={order.orderUrl} style={btn}>
        Siparişi görüntüle
      </Button>
    </Layout>
  );
}

export function Shipped({ order, carrier, trackingNo, trackingUrl }: { order: EmailOrder; carrier: string; trackingNo: string; trackingUrl?: string }) {
  return (
    <Layout preview={`${order.orderNo} kargoya verildi`} title="Siparişiniz yolda">
      <Text style={p}>Merhaba {order.customerName}, siparişiniz {carrier} ile kargoya verildi.</Text>
      <Text style={p}>
        Takip numarası: <strong>{trackingNo}</strong>
      </Text>
      {trackingUrl && (
        <Button href={trackingUrl} style={btn}>
          Kargoyu takip et
        </Button>
      )}
    </Layout>
  );
}

export function ReviewInvite({ order, reviewUrl }: { order: EmailOrder; reviewUrl: string }) {
  return (
    <Layout preview="Şalınızı nasıl buldunuz?" title="Nasıl buldunuz?">
      <Text style={p}>Merhaba {order.customerName}, siparişiniz elinize ulaştı. Birkaç cümlelik yorumunuz başka sanatseverlerin seçimine çok yardımcı olur.</Text>
      <Button href={reviewUrl} style={btn}>
        Yorum yaz
      </Button>
    </Layout>
  );
}

export function OrderCancelled({ order, reason }: { order: EmailOrder; reason: string }) {
  return (
    <Layout preview={`${order.orderNo} iptal edildi`} title="Siparişiniz iptal edildi">
      <Text style={p}>Merhaba {order.customerName}, {order.orderNo} numaralı siparişiniz iptal edildi. {reason}</Text>
      <Text style={p}>Ödeme yaptıysanız iadesi aynı yöntemle yapılır. Bir yanlışlık olduğunu düşünüyorsanız bize yazın.</Text>
    </Layout>
  );
}

export function BackInStock({ productName, productUrl }: { productName: string; productUrl: string }) {
  return (
    <Layout preview={`${productName} yeniden satışta`} title="Beklediğiniz desen geldi">
      <Text style={p}>
        <span style={{ fontFamily: serif }}>{productName}</span> yeniden satışta. Her desenden yalnızca birkaç parça olduğu için erken davranmanızı öneririz.
      </Text>
      <Button href={productUrl} style={btn}>
        Ürüne git
      </Button>
    </Layout>
  );
}

export function NewsletterConfirm({ confirmUrl }: { confirmUrl: string }) {
  return (
    <Layout preview="E-bülten kaydınızı onaylayın" title="Kaydınızı onaylayın">
      <Text style={p}>Hera e-bültenine katılmak için aşağıdaki bağlantıya tıklayın. Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.</Text>
      <Button href={confirmUrl} style={btn}>
        Kaydımı onayla
      </Button>
    </Layout>
  );
}

export function AdminNewOrder({ order, paymentLabel, adminUrl }: { order: EmailOrder; paymentLabel: string; adminUrl: string }) {
  return (
    <Layout preview={`Yeni sipariş: ${order.orderNo}`} title={`Yeni sipariş · ${order.orderNo}`}>
      <Text style={p}>
        {order.customerName} · {paymentLabel}
      </Text>
      <Items order={order} />
      <Link href={adminUrl} style={{ color: C.ink }}>
        Yönetim panelinde aç
      </Link>
    </Layout>
  );
}
