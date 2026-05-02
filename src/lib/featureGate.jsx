import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";

const ActivationContext = createContext({
  isActivated: false,
  isLoading: true,
  refresh: () => {},
});

export function ActivationProvider({ children }) {
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const check = async () => {
    if (!window.electronAPI?.checkActivation) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await window.electronAPI.checkActivation();
      setIsActivated(result.activated);
    } catch {
      setIsActivated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  return (
    <ActivationContext.Provider value={{ isActivated, isLoading, refresh: check }}>
      {children}
    </ActivationContext.Provider>
  );
}

export function useActivation() {
  return useContext(ActivationContext);
}

export function MembershipGuard({ children }) {
  const { isActivated, isLoading } = useActivation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isActivated) {
    return children;
  }

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-orange-600 mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">会员专属功能</h3>
        <p className="text-sm text-slate-500 mb-6">此功能需要激活会员后使用</p>
        <button
          onClick={() => navigate("/membership")}
          className="rounded-2xl bg-orange-600 px-8 py-3 font-bold text-white shadow-lg hover:bg-orange-700 hover:shadow-orange-600/20 transition"
        >
          开通会员
        </button>
      </div>
      <div className="opacity-20 pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
}
