import React, { useState } from 'react';
import { 
  Info, X, Sparkles, CheckCircle2, Lightbulb, 
  BookOpen, ShieldCheck, HelpCircle, ArrowRight
} from 'lucide-react';

const FeatureGuide = ({ 
  title, 
  subtitle, 
  category = "Enterprise Feature",
  whatItIs, 
  whyItMatters, 
  howToUse = [], 
  proTip,
  buttonLabel = "About this Feature",
  variant = "button" // 'button' or 'inline'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      {variant === 'button' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/80 transition-all shadow-2xs hover:shadow-xs group"
          title="Click to learn about this feature"
        >
          <Info size={14} className="text-indigo-600 group-hover:rotate-12 transition-transform" />
          <span>{buttonLabel}</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Learn more about this feature"
        >
          <Info size={16} />
        </button>
      )}

      {/* Guide Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-md">
                  <BookOpen size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {category}
                  </span>
                  <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">{title}</h3>
                  {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* What It Is */}
            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-indigo-700">
                <Sparkles size={14} /> What is this feature?
              </h4>
              <p className="text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                {whatItIs}
              </p>
            </div>

            {/* Why It Matters */}
            {whyItMatters && (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-emerald-700">
                  <ShieldCheck size={14} /> Why it matters for business
                </h4>
                <p className="text-gray-600 leading-relaxed bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                  {whyItMatters}
                </p>
              </div>
            )}

            {/* Step-by-Step How To Use */}
            {howToUse && howToUse.length > 0 && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-purple-700">
                  <CheckCircle2 size={14} /> How to use this screen
                </h4>
                <div className="space-y-2">
                  {howToUse.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="h-5 w-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                      <p className="text-gray-700 text-xs leading-normal">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supply Chain Pro-Tip */}
            {proTip && (
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800">
                    Supply Chain Pro-Tip
                  </span>
                  <p className="mt-0.5 leading-normal">{proTip}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeatureGuide;
