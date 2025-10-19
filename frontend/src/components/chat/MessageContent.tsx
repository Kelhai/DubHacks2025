/* eslint-disable @typescript-eslint/no-unused-vars */
import { InlineMath, BlockMath } from 'react-katex';
import './MessageContent.css';

interface MessageContentProps {
    content: string;
    isUser: boolean;
}

export default function MessageContent({ content, isUser }: MessageContentProps) {
    // Parse content to find LaTeX blocks and inline math
    const parseContent = (text: string) => {
        const parts: JSX.Element[] = [];
        let key = 0;

        // Pattern for block math: $$...$$
        const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;

        // First, find all block math sections
        const blockMatches: Array<{ start: number; end: number; content: string }> = [];
        let match;

        while ((match = blockMathRegex.exec(text)) !== null) {
            blockMatches.push({
                start: match.index,
                end: match.index + match[0].length,
                content: match[1].trim()
            });
        }

        // Process text with both block and inline math
        let currentPos = 0;

        for (const blockMatch of blockMatches) {
            // Process text before this block (may contain inline math)
            if (currentPos < blockMatch.start) {
                const beforeText = text.substring(currentPos, blockMatch.start);
                parts.push(...parseInlineMath(beforeText, key));
                key += 100;
            }

            // Add block math
            parts.push(
                <div key={key++} className="message-block-math">
                    <BlockMath math={blockMatch.content} />
                </div>
            );

            currentPos = blockMatch.end;
        }

        // Process remaining text (may contain inline math)
        if (currentPos < text.length) {
            const remainingText = text.substring(currentPos);
            parts.push(...parseInlineMath(remainingText, key));
        }

        return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
    };

    const parseInlineMath = (text: string, startKey: number): JSX.Element[] => {
        const parts: JSX.Element[] = [];
        const inlineMathRegex = /\$([^\$\n]+?)\$/g;
        let lastIndex = 0;
        let match;
        let key = startKey;

        while ((match = inlineMathRegex.exec(text)) !== null) {
            // Add text before math
            if (match.index > lastIndex) {
                const beforeText = text.substring(lastIndex, match.index);
                parts.push(...parseTextWithFormatting(beforeText, key));
                key += 10;
            }

            // Add inline math
            parts.push(
                <span key={key++} className="message-inline-math">
                    <InlineMath math={match[1]} />
                </span>
            );

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            parts.push(...parseTextWithFormatting(remainingText, key));
        }

        return parts.length > 0 ? parts : [<span key={startKey}>{text}</span>];
    };

    const parseTextWithFormatting = (text: string, startKey: number): JSX.Element[] => {
        // Split by newlines and code blocks
        const lines = text.split('\n');
        const parts: JSX.Element[] = [];
        let key = startKey;

        lines.forEach((line, index) => {
            // Check for code blocks
            if (line.trim().startsWith('```')) {
                parts.push(<span key={key++}>{line}</span>);
            } else {
                // Parse inline code
                const codeParts = line.split(/(`[^`]+`)/g);
                codeParts.forEach((part) => {
                    if (part.startsWith('`') && part.endsWith('`')) {
                        parts.push(
                            <code key={key++} className="message-inline-code">
                                {part.slice(1, -1)}
                            </code>
                        );
                    } else if (part) {
                        parts.push(<span key={key++}>{part}</span>);
                    }
                });
            }

            if (index < lines.length - 1) {
                parts.push(<br key={key++} />);
            }
        });

        return parts;
    };

    return (
        <div className={`message-content ${isUser ? 'message-content-user' : 'message-content-assistant'}`}>
            {parseContent(content)}
        </div>
    );
}