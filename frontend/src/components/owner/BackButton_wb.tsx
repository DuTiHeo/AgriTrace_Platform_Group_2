import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  label: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function BackButton({ label, to, onClick, disabled = false }: Props) {
  if (to && !onClick && !disabled) {
    return <Link className="page-back-button" to={to} title={label} aria-label={label}><ArrowLeft size={20} aria-hidden="true" /></Link>;
  }
  return <button className="page-back-button" type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}><ArrowLeft size={20} aria-hidden="true" /></button>;
}
