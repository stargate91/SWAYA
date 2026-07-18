import { DollarSign, Coins, TrendingUp } from '@/ui/icons';
import Card from '@/ui/Card';
import Grid from '@/ui/Grid';
import StatCard from '@/ui/data/StatCard';

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

  const renderStat = (icon, label, value, themeType) => {
    return (
      <StatCard
        icon={icon}
        label={label}
        value={value}
        state={themeType}
      />
    );
  };

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={t('library.details.boxOffice') || 'Box Office'}
    >
      <Grid variant="auto-fit">
        {item.budget > 0 && renderStat(<DollarSign size={16} />, t('library.details.budget') || 'Budget', budgetStr, 'default')}
        {item.revenue > 0 && renderStat(<Coins size={16} />, t('library.details.revenue') || 'Revenue', revenueStr, 'default')}
        {hasProfitInfo && renderStat(
          <TrendingUp size={16} />,
          isProfit ? (t('library.details.profit') || 'Net Profit') : (t('library.details.loss') || 'Net Loss'),
          formatCurrency(Math.abs(netProfit)),
          isProfit ? 'profit' : 'loss'
        )}
      </Grid>
    </Card>
  );
}


