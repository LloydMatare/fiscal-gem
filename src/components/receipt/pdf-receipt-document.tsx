import { Document, Page, View, Text, StyleSheet, Svg, Path, Rect } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#005F02",
    paddingBottom: 10,
  },
  headerLeft: { flex: 1 },
  headerRight: { width: 180, alignItems: "flex-end" },
  logoText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#005F02",
    marginBottom: 4,
  },
  logoSubtext: { fontSize: 8, color: "#666" },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginVertical: 10,
    color: "#005F02",
    letterSpacing: 2,
  },
  blocksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  block: { flex: 1, marginRight: 10 },
  blockLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  blockRow: { flexDirection: "row", marginBottom: 2 },
  blockFieldLabel: { fontSize: 8, color: "#666", width: 55 },
  blockFieldValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  receiptInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
  },
  receiptInfoItem: { flex: 1, paddingRight: 10, paddingLeft: 0 },
  receiptInfoLabel: { fontSize: 7, color: "#666", marginBottom: 2 },
  receiptInfoValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  table: { marginBottom: 10 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#005F02",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableCell: { fontSize: 8 },
  colCode: { width: 50 },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "right" },
  colPrice: { width: 60, textAlign: "right" },
  colTax: { width: 40, textAlign: "right" },
  colTotal: { width: 65, textAlign: "right" },
  summarySection: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  taxBlock: { flex: 1, marginRight: 20 },
  paymentBlock: { width: 200 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  summaryLabel: { fontSize: 8, color: "#666" },
  summaryValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#005F02",
    paddingTop: 4,
    marginTop: 4,
  },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#005F02" },
  totalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#005F02" },
  notes: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  notesLabel: { fontSize: 7, color: "#666", marginBottom: 2 },
  notesText: { fontSize: 8, fontStyle: "italic" },
  footer: { marginTop: 15, borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 8 },
  verificationCode: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  verifyUrl: { fontSize: 7, textAlign: "center", color: "#666" },
  deviceIdBadge: { fontSize: 7, color: "#999", textAlign: "center", marginTop: 4 },
});

export interface ReceiptData {
  receiptGlobalNo: number | null;
  receiptCounter: number | null;
  invoiceNo: string | null;
  receiptType: string | null;
  fiscalDayNo: number | null;
  receiptDate: string | null;
  receiptTime: string | null;
  receiptCurrency: string | null;
  receiptTotal: number | null;
  receiptNotes: string | null;
  receiptPrintForm: string | null;
  username: string | null;
  operatorId: string | null;
  seller: {
    companyName: string;
    tradeName: string;
    tin: string;
    vatNumber: string;
    branchName: string;
    address: string;
    email: string;
    phone: string;
  };
  buyer: {
    registerName: string;
    tradeName: string;
    tin: string;
    vatNumber: string;
    address: string;
    email: string;
    phone: string;
  } | null;
  lines: Array<{
    lineNo: number;
    lineType: string;
    hsCode: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxCode: string;
    taxPercent: number;
    taxAmount: number;
    totalInclTax: number;
  }>;
  taxes: Array<{
    taxCode: string;
    taxPercent: number;
    taxAmount: number;
    salesAmountWithTax: number;
  }>;
  payments: Array<{
    paymentType: string;
    paymentAmount: number;
  }>;
  deviceId: number;
  deviceSerialNo: string;
  qrCodeSvgPath: string | null;
  verificationCode: string;
  verifyUrl: string;
}

function QrCodeSvg({ pathData }: { pathData: string }) {
  const size = 80;
  return (
    <Svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} fill="#ffffff" />
      <Path d={pathData} fill="#000000" />
    </Svg>
  );
}

export function PdfReceiptDocument({ data }: { data: ReceiptData }) {
  const formatMoney = (amount: number | string | null) => {
    if (amount == null) return "$0.00";
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(n)) return "$0.00";
    return `$${n.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "\u2014";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string | null, timeStr: string | null) => {
    if (timeStr) return timeStr;
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "";
    }
  };

  const receiptDateFormatted = formatDate(data.receiptDate);
  const receiptTimeFormatted = formatTime(data.receiptDate, data.receiptTime);
  const receiptGlobalNo = data.receiptGlobalNo || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>
              {data.seller.companyName || data.seller.tradeName || "Company"}
            </Text>
            {data.seller.tradeName && data.seller.tradeName !== data.seller.companyName && (
              <Text style={styles.logoSubtext}>{data.seller.tradeName}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {data.qrCodeSvgPath ? (
              <QrCodeSvg pathData={data.qrCodeSvgPath} />
            ) : (
              <Text style={{ fontSize: 7, color: "#999" }}>QR Code</Text>
            )}
          </View>
        </View>

        <Text style={styles.title}>FISCAL TAX INVOICE</Text>

        <View style={styles.blocksRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>SELLER</Text>
            <FieldRow label="Company" value={data.seller.companyName} />
            {data.seller.tradeName && <FieldRow label="Trade" value={data.seller.tradeName} />}
            {data.seller.tin && <FieldRow label="TIN" value={data.seller.tin} />}
            {data.seller.vatNumber && <FieldRow label="VAT No" value={data.seller.vatNumber} />}
            {data.seller.branchName && <FieldRow label="Branch" value={data.seller.branchName} />}
            {data.seller.address && <FieldRow label="Address" value={data.seller.address} />}
            {data.seller.email && <FieldRow label="Email" value={data.seller.email} />}
            {data.seller.phone && <FieldRow label="Phone" value={data.seller.phone} />}
          </View>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>BUYER</Text>
            {data.buyer ? (
              <>
                {data.buyer.registerName && <FieldRow label="Name" value={data.buyer.registerName} />}
                {data.buyer.tradeName && <FieldRow label="Trade" value={data.buyer.tradeName} />}
                {data.buyer.tin && <FieldRow label="TIN" value={data.buyer.tin} />}
                {data.buyer.vatNumber && <FieldRow label="VAT" value={data.buyer.vatNumber} />}
                {data.buyer.address && <FieldRow label="Address" value={data.buyer.address} />}
                {data.buyer.email && <FieldRow label="Email" value={data.buyer.email} />}
                {data.buyer.phone && <FieldRow label="Phone" value={data.buyer.phone} />}
              </>
            ) : (
              <Text style={{ fontSize: 8, color: "#999", fontStyle: "italic" }}>No buyer information</Text>
            )}
          </View>
        </View>

        <View style={styles.receiptInfoRow}>
          <View style={styles.receiptInfoItem}>
            <Text style={styles.receiptInfoLabel}>Invoice No</Text>
            <Text style={styles.receiptInfoValue}>{data.receiptCounter}/{receiptGlobalNo}</Text>
          </View>
          <View style={styles.receiptInfoItem}>
            <Text style={styles.receiptInfoLabel}>Fiscal Day No</Text>
            <Text style={styles.receiptInfoValue}>{data.fiscalDayNo}</Text>
          </View>
          <View style={styles.receiptInfoItem}>
            <Text style={styles.receiptInfoLabel}>Device ID</Text>
            <Text style={styles.receiptInfoValue}>{data.deviceId}</Text>
          </View>
          <View style={styles.receiptInfoItem}>
            <Text style={styles.receiptInfoLabel}>Date</Text>
            <Text style={styles.receiptInfoValue}>{receiptDateFormatted} {receiptTimeFormatted}</Text>
          </View>
        </View>
        <View style={styles.receiptInfoRow}>
          <View style={[styles.receiptInfoItem, { flex: 2 }]}>
            <Text style={styles.receiptInfoLabel}>Customer Ref</Text>
            <Text style={styles.receiptInfoValue}>{data.invoiceNo}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colCode]}>Code</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.colTax]}>Tax %</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Amount</Text>
          </View>
          {data.lines.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colCode]}>{line.hsCode || ""}</Text>
              <Text style={[styles.tableCell, styles.colDesc]}>
                {line.lineType === "Discount" ? "Discount: " : ""}{line.name}
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>{line.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatMoney(line.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.colTax]}>{line.taxPercent}%</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{formatMoney(line.totalPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summarySection}>
          <View style={styles.taxBlock}>
            <Text style={styles.blockLabel}>TAXES</Text>
            {data.taxes.map((tax, i) => (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Tax {tax.taxPercent}%{tax.taxCode ? ` (${tax.taxCode})` : ""}
                </Text>
                <Text style={styles.summaryValue}>{formatMoney(tax.taxAmount)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.paymentBlock}>
            <Text style={styles.blockLabel}>PAYMENTS</Text>
            {data.payments.map((p, i) => (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{p.paymentType}</Text>
                <Text style={styles.summaryValue}>{formatMoney(p.paymentAmount)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(data.receiptTotal)}</Text>
            </View>
          </View>
        </View>

        {data.receiptNotes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{data.receiptNotes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {data.verificationCode && (
            <Text style={styles.verificationCode}>{data.verificationCode}</Text>
          )}
          {data.verifyUrl && (
            <Text style={styles.verifyUrl}>Verify: {data.verifyUrl}</Text>
          )}
          <Text style={styles.deviceIdBadge}>
            Fiscal Device ID: {data.deviceId} | Print Form: {data.receiptPrintForm || "Receipt48"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.blockRow}>
      <Text style={styles.blockFieldLabel}>{label}:</Text>
      <Text style={styles.blockFieldValue}>{value}</Text>
    </View>
  );
}
