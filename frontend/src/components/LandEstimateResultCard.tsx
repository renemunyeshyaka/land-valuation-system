import React from 'react';

interface LandEstimateResultCardProps {
  estimateResult: any;
}

const LandEstimateResultCard: React.FC<LandEstimateResultCardProps> = ({ estimateResult }) => {
  if (!estimateResult) return null;
  return (
    <div className="mt-6 p-6 bg-white border-2 border-emerald-200 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-emerald-700 mb-1 flex items-center gap-2">
        <i className="fas fa-coins text-emerald-500"></i>
        Land Value Estimate
      </h3>
      <p className="text-gray-700 mb-4 text-sm">
        Estimated land value range and weighted average for your selected plot. <span className="text-gray-400" title="Estimates are based on recent comparable sales and market data."><i className="fas fa-info-circle"></i></span>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <i className="fas fa-arrow-down text-blue-500" title="Lowest comparable value per sqm"></i>
          <span className="font-medium text-blue-700" title="Lowest comparable value per sqm">Min Value/sqm</span>
          <span className="ml-auto text-blue-900 font-bold" title={`${Number(estimateResult.min_value_per_sqm).toLocaleString()} RWF/sqm`}>
            RWF {Number(estimateResult.min_value_per_sqm).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <i className="fas fa-balance-scale text-emerald-500" title="Weighted average value per sqm"></i>
          <span className="font-medium text-emerald-700" title="Weighted average value per sqm">Weighted Avg/sqm</span>
          <span className="ml-auto text-emerald-900 font-bold" title={`${Number(estimateResult.weighted_avg_value_per_sqm).toLocaleString()} RWF/sqm`}>
            RWF {Number(estimateResult.weighted_avg_value_per_sqm).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <i className="fas fa-arrow-up text-rose-500" title="Highest comparable value per sqm"></i>
          <span className="font-medium text-rose-700" title="Highest comparable value per sqm">Max Value/sqm</span>
          <span className="ml-auto text-rose-900 font-bold" title={`${Number(estimateResult.max_value_per_sqm).toLocaleString()} RWF/sqm`}>
            RWF {Number(estimateResult.max_value_per_sqm).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <i className="fas fa-arrow-down text-blue-500" title="Total minimum value estimate"></i>
          <span className="font-medium text-blue-700" title="Total minimum value estimate">Total Min Value</span>
          <span className="ml-auto text-blue-900 font-bold" title={`${Number(estimateResult.total_min_value).toLocaleString()} RWF`}>
            RWF {Number(estimateResult.total_min_value).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <i className="fas fa-balance-scale text-emerald-500" title="Total weighted average value estimate"></i>
          <span className="font-medium text-emerald-700" title="Total weighted average value estimate">Total Weighted Avg</span>
          <span className="ml-auto text-emerald-900 font-bold" title={`${Number(estimateResult.total_weighted_avg_value).toLocaleString()} RWF`}>
            RWF {Number(estimateResult.total_weighted_avg_value).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <i className="fas fa-arrow-up text-rose-500" title="Total maximum value estimate"></i>
          <span className="font-medium text-rose-700" title="Total maximum value estimate">Total Max Value</span>
          <span className="ml-auto text-rose-900 font-bold" title={`${Number(estimateResult.total_max_value).toLocaleString()} RWF`}>
            RWF {Number(estimateResult.total_max_value).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
        <i className="fas fa-info-circle"></i>
        <span>
          <b>Tip:</b> Weighted average is highlighted as the most reliable estimate. All values are in Rwandan Francs (RWF) and formatted for clarity.
        </span>
      </div>
      {/* Important Note: 6 conditions for maximum price */}
      <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded shadow-sm">
        <div className="flex items-center mb-2">
          <i className="fas fa-exclamation-triangle text-amber-500 mr-2"></i>
          <span className="font-semibold text-amber-700">Important:</span>
        </div>
        <div className="text-sm text-amber-800">
          To qualify for the <b>Maximum Value Per Sqm</b>, the following 6 conditions must all be met:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Road</li>
            <li>Electricity</li>
            <li>Water</li>
            <li>School</li>
            <li>Health facility</li>
            <li>Market</li>
          </ul>
          <span className="block mt-2 text-xs text-amber-700">If fewer than 6 are met, the weighted average or minimum value is used.</span>
        </div>
      </div>
    </div>
  );
};

export default LandEstimateResultCard;
