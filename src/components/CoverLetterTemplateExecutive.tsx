import { memo } from 'react';
import type { CoverLetterData } from '../types';

interface CoverLetterTemplateExecutiveProps {
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

export const CoverLetterTemplateExecutive = memo(function CoverLetterTemplateExecutive({ data }: CoverLetterTemplateExecutiveProps) {
    const contactItems = [
        data.email,
        data.phone,
        data.location,
        data.portfolio ? displayUrl(data.portfolio) : '',
        data.linkedin ? displayUrl(data.linkedin) : '',
    ].filter(Boolean);

    return (
        <div className="re2-root">
            <header className="re2-header">
                <div className="re2-name-block">
                    <h1 className="re2-name">{data.fullName || 'Candidate Name'}</h1>
                    <div className="re2-role">{data.title || 'Professional Title'}</div>
                </div>
                <div className="re2-contact-block">
                    {contactItems.map((item, i) => (
                        <span key={i} className="re2-contact-item">{item}</span>
                    ))}
                </div>
            </header>

            <div className="re2-rule-top" />

            <div className="re2-body">
                {/* Date + Recipient */}
                <section className="re2-section">
                    <div className="re2-section-label">{data.date}</div>
                    <div className="re2-section-content">
                        <div style={{ fontSize: '14px', lineHeight: '1.65', color: '#1a1a1a' }}>
                            <div style={{ fontWeight: 700 }}>{data.recipientName || 'Hiring Manager'}</div>
                            {data.recipientTitle && <div>{data.recipientTitle}</div>}
                            {data.companyName && <div>{data.companyName}</div>}
                            {data.companyLocation && <div>{data.companyLocation}</div>}
                        </div>
                        {data.subject && (
                            <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555' }}>
                                Re: {data.subject}
                            </div>
                        )}
                    </div>
                </section>

                {/* Letter body */}
                <section className="re2-section">
                    <div className="re2-section-label">Letter</div>
                    <div className="re2-section-content re2-letter-body">
                        <p>{data.greeting || 'Dear Hiring Manager,'}</p>
                        {data.opening && <p>{data.opening}</p>}
                        {data.body.map((para, i) => <p key={i}>{para}</p>)}
                        {data.closing && <p>{data.closing}</p>}
                        <div style={{ marginTop: '28px' }}>
                            <p style={{ marginBottom: '32px' }}>{data.signoff || 'Warm regards,'}</p>
                            <p style={{ fontWeight: 700, fontSize: '16px' }}>{data.signatureName || data.fullName}</p>
                        </div>
                    </div>
                </section>
            </div>

            <div className="re2-rule-bottom" />
        </div>
    );
});
