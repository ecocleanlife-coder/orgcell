import React from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can log the error to an error reporting service here
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 m-4 bg-red-50 rounded-xl border border-red-200">
                    <AlertOctagon size={48} className="text-red-500 mb-4" />
                    <h2 className="text-lg font-bold text-red-700 mb-2">무언가 잘못되었습니다.</h2>
                    <p className="text-sm text-red-600 mb-6 text-center">
                        화면을 렌더링하는 도중 예상치 못한 오류가 발생했습니다.<br />
                        새로고침을 눌러 다시 시도해주세요.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                    >
                        <RefreshCcw size={16} />
                        페이지 새로고침
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <pre className="mt-8 p-4 bg-red-100/50 rounded w-full overflow-auto text-[10px] text-red-800 border border-red-200">
                            {this.state.error?.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
