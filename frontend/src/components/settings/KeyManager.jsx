import React, { useState } from 'react';
import useCryptoStore from '../../store/cryptoStore';

export default function KeyManager() {
    const { masterKey, exportMasterKey, importMasterKey, clearKey } = useCryptoStore();
    const [importStr, setImportStr] = useState('');
    const [status, setStatus] = useState('');

    const handleExport = async () => {
        try {
            const b64 = await exportMasterKey();
            navigator.clipboard.writeText(b64);
            setStatus('마스터 키가 클립보드에 복사되었습니다. 안전한 곳에 보관하세요!');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            alert('키 내보내기 실패');
        }
    };

    const handleImport = async () => {
        if (!importStr) return;
        const success = await importMasterKey(importStr.trim());
        if (success) {
            setStatus('새 마스터 키가 성공적으로 등록되었습니다.');
            setImportStr('');
            setTimeout(() => setStatus(''), 3000);
        } else {
            alert('잘못된 형태의 키입니다.');
        }
    };

    const handleReset = async () => {
        if (window.confirm("경고: 마스터 키를 삭제하면 기존에 암호화된 기밀 사진들을 다시는 복구할 수 없습니다! 진행하시겠습니까?")) {
            await clearKey();
            setStatus('마스터 키가 삭제되었습니다. 새로고침 시 새 키가 발급됩니다.');
        }
    };

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm text-sm">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>🔐</span> E2E 종단간 암호화 설정
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                서버 관리자조차 사용자의 사진을 볼 수 없도록 기기 내부에서 암호화합니다.
                <br />이 기기(브라우저)를 분실하거나 캐시를 지우면 사진 복구가 불가능하므로 반드시 <b>키를 백업</b>해두세요.
            </p>

            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded border">
                <span className="font-medium w-24">상태:</span>
                {masterKey ? (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> 키 활성화됨
                    </span>
                ) : (
                    <span className="text-red-500">키 없음</span>
                )}
            </div>

            {status && <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded text-xs">{status}</div>}

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleExport}
                    className="py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-900"
                >
                    현재 마스터 키 백업 (클립보드 복사)
                </button>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={importStr}
                        onChange={(e) => setImportStr(e.target.value)}
                        placeholder="백업해둔 텍스트 키 붙여넣기"
                        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-xs"
                    />
                    <button
                        onClick={handleImport}
                        className="px-4 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 whitespace-nowrap"
                    >
                        키 복원
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed">
                    <button
                        onClick={handleReset}
                        className="text-xs text-red-500 underline"
                    >
                        기존 키 강제 삭제 (위험)
                    </button>
                </div>
            </div>
        </div>
    );
}
