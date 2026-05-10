import { memo } from 'react';
import type { CoverLetterData } from '../types';

interface CoverLetterTemplateProps {
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

export const CoverLetterTemplate = memo(function CoverLetterTemplate({ data }: CoverLetterTemplateProps) {
    const contactItems = [
        data.email,
        data.phone,
        data.location,
        data.portfolio ? displayUrl(data.portfolio) : '',
        data.linkedin ? displayUrl(data.linkedin) : '',
    ].filter((item): item is string => Boolean(item));

    return (
        <div className="resume-container">
            <header className="header">
                <h1>{data.fullName || 'Candidate Name'}</h1>
                <div className="title">{data.title || 'Professional Title'}</div>
                {contactItems.length > 0 && (
                    <div className="contact-info">
                        {contactItems.map((item, i) => (
                            <span key={`${item}-${i}`}>
                                {item}{i < contactItems.length - 1 && <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>}
                            </span>
                        ))}
                    </div>
                )}
            </header>

            <div className="content">
                <div style={{ marginBottom: '35px', fontSize: '15px', lineHeight: '1.6', color: '#333' }}>
                    {data.date && <div style={{ marginBottom: '15px' }}>{data.date}</div>}
                    <div><strong>{data.recipientName || 'Hiring Manager'}</strong></div>
                    {data.recipientTitle && <div>{data.recipientTitle}</div>}
                    {data.companyName && <div>{data.companyName}</div>}
                    {data.companyLocation && <div>{data.companyLocation}</div>}
                    
                    {data.subject && (
                        <div style={{ marginTop: '20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #333', paddingBottom: '5px', display: 'inline-block' }}>
                            RE: {data.subject}
                        </div>
                    )}
                </div>

                <div className="summary" style={{ fontSize: '15px', lineHeight: '1.6', color: '#333' }}>
                    <p style={{ marginBottom: '15px' }}>{data.greeting || 'Dear Hiring Manager,'}</p>
                    
                    {data.opening && <p style={{ marginBottom: '15px' }}>{data.opening}</p>}
                    
                    {data.body.map((paragraph, index) => (
                        <p key={`${paragraph.slice(0, 24)}-${index}`} style={{ marginBottom: '15px' }}>{paragraph}</p>
                    ))}
                    
                    {data.closing && <p style={{ marginBottom: '15px' }}>{data.closing}</p>}
                    
                    <div style={{ marginTop: '24px' }}>
                        <p>{data.signoff || 'Warm regards,'}</p>
                        <p style={{ fontWeight: '900', marginTop: '14px', fontSize: '17px' }}>{data.signatureName || data.fullName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
