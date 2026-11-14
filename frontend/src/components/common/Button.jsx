import { LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
export default function Button({
  children,
  variant = "primary",
  icon: Icon,
  loading = false,
  to,
  className = "",
  disabled,
  ...props
}) {
  const classes = `btn btn-${variant} ${className}`;
  const contents = (
    <>
      {loading ? (
        <LoaderCircle size={16} className="spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={16} aria-hidden="true" />
      ) : null}
      {children}
    </>
  );
  return to ? (
    <Link to={to} className={classes} {...props}>
      {contents}
    </Link>
  ) : (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {contents}
    </button>
  );
}
