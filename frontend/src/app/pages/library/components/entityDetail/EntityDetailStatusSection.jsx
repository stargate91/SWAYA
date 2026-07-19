import Card from '@/ui/Card';
import Text from '@/ui/Text';
import styles from './EntityDetailStatusSection.module.css';

export default function EntityDetailStatusSection({ title, message }) {
  return (
    <section className={styles.container}>
      <Card variant="default" padding="xl">
        <Text variant="title-md" weight="bold" className="u-mb-md">
          {title}
        </Text>
        <Text variant="body" color="secondary" className="u-leading-relaxed">
          {message}
        </Text>
      </Card>
    </section>
  );
}

