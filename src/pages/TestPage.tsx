const TestPage = () => {
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText('www.naver.com');
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      // Fallback: 구형 브라우저 지원
      const textArea = document.createElement('textarea');
      textArea.value = 'www.naver.com';
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackError) {
        console.error('Fallback 클립보드 복사 실패:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="w-full py-3 px-4 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            클립보드에 복사 (www.naver.com)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestPage;

