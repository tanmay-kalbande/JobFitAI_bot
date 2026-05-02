import { memo } from 'react';
import type { CoverLetterData } from '../types';

interface CoverLetterTemplateModernProps {
    data: CoverLetterData;
}

function displayUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
        return url;
    }
}

export const CoverLetterTemplateModern = memo(function CoverLetterTemplateModern({ data }: CoverLetterTemplateModernProps) {
    const contactItems = [
        data.email,
        data.phone,
        data.location,
        data.portfolio ? displayUrl(data.portfolio) : '',
        data.linkedin ? displayUrl(data.linkedin) : '',
    ].filter((item): item is string => Boolean(item));

    return (
        <div className="cover-letter-modern">
            <header className="cover-letter-modern-head">
                <div>
                    <div className="cover-letter-modern-name">{data.fullName || 'Candidate Name'}</div>
                    <div className="cover-letter-modern-title">{data.title || 'Professional Title'}</div>
                </div>
                {data.date && <div className="cover-letter-modern-date">{data.date}</div>}
            </header>

            {contactItems.length > 0 && (
                <div className="cover-letter-modern-contact">
                    {contactItems.map(item => (
                        <span key={item}>{item}</span>
                    ))}
                </div>
            )}

            <div className="cover-letter-modern-rule" />

            <section className="cover-letter-modern-recipient">
                <div className="cover-letter-modern-label">To</div>
                <div className="cover-letter-modern-recipient-copy">
                    <div>{data.recipientName || 'Hiring Manager'}</div>
                    <div>{data.recipientTitle || data.companyName}</div>
                    <div>{data.companyName}</div>
                    {data.companyLocation && <div>{data.companyLocation}</div>}
                </div>
            </section>

            {data.subject && (
                <section className="cover-letter-modern-subject-row">
                    <div className="cover-letter-modern-label">Subject</div>
                    <div className="cover-letter-modern-subject">{data.subject}</div>
                </section>
            )}

            <section className="cover-letter-modern-body">
                <p>{data.greeting || 'Dear Hiring Manager,'}</p>
                {data.opening && <p>{data.opening}</p>}
                {data.body.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
                ))}
                {data.closing && <p>{data.closing}</p>}
            </section>

            <footer className="cover-letter-modern-footer">
                <div>{data.signoff || 'Warm regards,'}</div>
                <div className="cover-letter-modern-signature">{data.signatureName || data.fullName}</div>
            </footer>
        </div>
    );
});
