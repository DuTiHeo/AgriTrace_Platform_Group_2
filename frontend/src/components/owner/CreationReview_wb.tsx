import type { ReactNode } from "react";
import "../../styles/creation_review_wb.css";

type ReviewSection = {
  title: string;
  metric?: { label: string; value: ReactNode };
  items: Array<{ label: string; value: ReactNode }>;
};

export default function CreationReview({ sections }: { sections: ReviewSection[] }) {
  return (
    <div className="creation-review-grid">
      {sections.map((section) => (
        <section className="creation-review-panel" key={section.title} aria-label={section.title}>
          <h3>{section.title}</h3>
          {section.metric && (
            <div className="creation-review-metric">
              <span>{section.metric.label}</span>
              <strong>{section.metric.value}</strong>
            </div>
          )}
          <dl className="creation-review-details">
            {section.items.map((item) => (
              <div className="creation-review-row" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
