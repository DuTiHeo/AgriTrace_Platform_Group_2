import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = { children: ReactNode };
type State = { failed: boolean };

class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Owner Web render error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error-page">
        <section className="card">
          <AlertTriangle size={38} />
          <h1>Trang web gặp sự cố</h1>
          <p>Dữ liệu của bạn vẫn được giữ nguyên. Hãy tải lại ứng dụng để tiếp tục.</p>
          <button className="btn btn-primary" type="button" onClick={() => window.location.assign("/")}><RotateCcw size={16} />Tải lại ứng dụng</button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
