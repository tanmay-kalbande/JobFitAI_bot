import './SkeletonResume.css';

export function SkeletonResume() {
    return (
        <div className="resume-container skeleton-resume">
            {/* Header Skeleton */}
            <div className="header">
                <div className="skeleton-line skeleton-name"></div>
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-contact">
                    <div className="skeleton-line skeleton-contact-item"></div>
                    <div className="skeleton-line skeleton-contact-item"></div>
                    <div className="skeleton-line skeleton-contact-item"></div>
                </div>
            </div>

            <div className="content">
                {/* Summary Section Skeleton */}
                <div className="section">
                    <div className="skeleton-line skeleton-section-title"></div>
                    <div className="skeleton-line skeleton-text-long"></div>
                    <div className="skeleton-line skeleton-text-long"></div>
                    <div className="skeleton-line skeleton-text-medium"></div>
                </div>

                {/* Experience Section Skeleton */}
                <div className="section">
                    <div className="skeleton-line skeleton-section-title"></div>
                    <div className="skeleton-experience">
                        <div className="skeleton-exp-header">
                            <div className="skeleton-line skeleton-job-title"></div>
                            <div className="skeleton-line skeleton-duration"></div>
                        </div>
                        <div className="skeleton-line skeleton-company"></div>
                        <div className="skeleton-duties">
                            <div className="skeleton-line skeleton-duty"></div>
                            <div className="skeleton-line skeleton-duty"></div>
                            <div className="skeleton-line skeleton-duty-short"></div>
                        </div>
                    </div>
                    <div className="skeleton-experience">
                        <div className="skeleton-exp-header">
                            <div className="skeleton-line skeleton-job-title"></div>
                            <div className="skeleton-line skeleton-duration"></div>
                        </div>
                        <div className="skeleton-line skeleton-company"></div>
                        <div className="skeleton-duties">
                            <div className="skeleton-line skeleton-duty"></div>
                            <div className="skeleton-line skeleton-duty-short"></div>
                        </div>
                    </div>
                </div>

                {/* Education Section Skeleton */}
                <div className="section">
                    <div className="skeleton-line skeleton-section-title"></div>
                    <div className="skeleton-education">
                        <div className="skeleton-line skeleton-degree"></div>
                        <div className="skeleton-line skeleton-institution"></div>
                    </div>
                </div>

                {/* Skills Section Skeleton */}
                <div className="section">
                    <div className="skeleton-line skeleton-section-title"></div>
                    <div className="skeleton-skills">
                        <div className="skeleton-line skeleton-skill-row"></div>
                        <div className="skeleton-line skeleton-skill-row"></div>
                        <div className="skeleton-line skeleton-skill-row-short"></div>
                    </div>
                </div>

                {/* Projects Section Skeleton */}
                <div className="section">
                    <div className="skeleton-line skeleton-section-title"></div>
                    <div className="skeleton-line skeleton-text-long"></div>
                    <div className="skeleton-line skeleton-text-medium"></div>
                </div>
            </div>
        </div>
    );
}
