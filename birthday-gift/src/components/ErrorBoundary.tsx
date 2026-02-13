"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-rose-100/80 to-pink-100/80 text-rose-800">
            <p className="text-lg font-medium mb-2">页面加载遇到问题</p>
            <p className="text-sm text-rose-600 mb-4">请刷新重试</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-rose-200 text-rose-800 font-medium hover:bg-rose-300"
            >
              刷新页面
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
