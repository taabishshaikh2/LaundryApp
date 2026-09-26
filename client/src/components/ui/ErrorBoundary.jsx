import React, { Component } from "react";
import Button from "./Button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            <Button onClick={this.handleReload} variant="primary" size="lg">
              Reload Page
            </Button>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-6 text-left text-sm text-gray-500">
                <summary className="cursor-pointer font-medium">Error details</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-xs">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
