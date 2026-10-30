import { QRCodeSVG } from "qrcode.react";

type TraceabilityCodeProps = { value: string; size?: number };

function TraceabilityCode({ value, size = 220 }: TraceabilityCodeProps) {
  return <QRCodeSVG className="traceability-code" value={value} size={size}
    level="M" marginSize={4} fgColor="#102c1d" title={`Mã truy xuất cho ${value}`} />;
}

export default TraceabilityCode;
