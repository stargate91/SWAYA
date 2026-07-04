 
import { DollarSign, Coins, TrendingUp } from 'lucide-react';

export default function BespokeBoxOfficeSection({ item, t }) {
  if (!item || (item.budget <= 0 && item.revenue <= 0)) return null;

  const formatCurrency = (val) => {
    if (!val || val <= 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const budgetStr = formatCurrency(item.budget);
  const revenueStr = formatCurrency(item.revenue);
  const netProfit = (item.revenue || 0) - (item.budget || 0);
  const hasProfitInfo = item.budget > 0 && item.revenue > 0;
  const isProfit = netProfit >= 0;

  return (
    <div className="bespoke-boxoffice-section">
      <div className="bespoke-boxoffice-card">
        <div className="bespoke-browser-card__pills-header">
          <span className="bespoke-cast-title">
            {t('library.details.boxOffice') || 'Box Office'}
          </span>
        </div>
        <div className="bespoke-boxoffice-body">
          {item.budget > 0 && (
            <div className="bespoke-boxoffice-stat">
              <div className="bespoke-boxoffice-icon-wrapper">
                <DollarSign size={16} />
              </div>
              <div className="bespoke-boxoffice-info">
                <span className="bespoke-boxoffice-label">
                  {t('library.details.budget') || 'Budget'}
                </span>
                <span className="bespoke-boxoffice-value">{budgetStr}</span>
              </div>
            </div>
          )}

          {item.revenue > 0 && (
            <div className="bespoke-boxoffice-stat">
              <div className="bespoke-boxoffice-icon-wrapper">
                <Coins size={16} />
              </div>
              <div className="bespoke-boxoffice-info">
                <span className="bespoke-boxoffice-label">
                  {t('library.details.revenue') || 'Revenue'}
                </span>
                <span className="bespoke-boxoffice-value">{revenueStr}</span>
              </div>
            </div>
          )}

          {hasProfitInfo && (
            <div className={`bespoke-boxoffice-stat ${isProfit ? 'bespoke-boxoffice-stat--profit' : 'bespoke-boxoffice-stat--loss'}`}>
              <div className="bespoke-boxoffice-icon-wrapper">
                <TrendingUp size={16} />
              </div>
              <div className="bespoke-boxoffice-info">
                <span className="bespoke-boxoffice-label">
                  {isProfit ? (t('library.details.profit') || 'Net Profit') : (t('library.details.loss') || 'Net Loss')}
                </span>
                <span className="bespoke-boxoffice-value">
                  {formatCurrency(Math.abs(netProfit))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
