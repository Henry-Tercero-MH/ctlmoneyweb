import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

export function Skeleton({ width = '100%', height = '16px', radius = '8px' }: SkeletonProps) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} />;
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.stack}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={i === count - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
