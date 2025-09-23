const fs = require('fs');
const path = require('path');

class DocumentService {
  constructor() {
    this.docsPath = path.join(__dirname, '../docs');
  }

  readMarkdownFiles() {
    try {
      const files = fs.readdirSync(this.docsPath);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      const documents = [];

      for (const file of markdownFiles) {
        const filePath = path.join(this.docsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        documents.push({
          filename: file,
          path: filePath,
          content: content,
          parsedContent: this.parseMarkdown(content)
        });
      }

      return documents;
    } catch (error) {
      console.error('Error reading markdown files:', error);
      return [];
    }
  }

  parseMarkdown(content) {
    const tokens = this.simpleMarkdownParse(content);
    return tokens;
  }

  simpleMarkdownParse(content) {
    const lines = content.split('\n');
    const tokens = [];
    let currentParagraph = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('#')) {
        if (currentParagraph) {
          tokens.push({
            type: 'paragraph',
            text: currentParagraph.trim()
          });
          currentParagraph = '';
        }

        const level = line.match(/^#+/)[0].length;
        tokens.push({
          type: 'heading',
          depth: level,
          text: trimmedLine.replace(/^#+\s*/, '')
        });
      } else if (trimmedLine.startsWith('```')) {
        if (currentParagraph) {
          tokens.push({
            type: 'paragraph',
            text: currentParagraph.trim()
          });
          currentParagraph = '';
        }

        let codeBlock = '';
        let i = lines.indexOf(line) + 1;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeBlock += lines[i] + '\n';
          i++;
        }

        tokens.push({
          type: 'code',
          text: codeBlock.trim(),
          lang: trimmedLine.replace('```', '')
        });
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        if (currentParagraph) {
          tokens.push({
            type: 'paragraph',
            text: currentParagraph.trim()
          });
          currentParagraph = '';
        }

        tokens.push({
          type: 'list',
          items: [{ text: trimmedLine.replace(/^[-*]\s*/, '') }]
        });
      } else if (trimmedLine === '') {
        if (currentParagraph) {
          tokens.push({
            type: 'paragraph',
            text: currentParagraph.trim()
          });
          currentParagraph = '';
        }
      } else {
        currentParagraph += line + ' ';
      }
    }

    if (currentParagraph) {
      tokens.push({
        type: 'paragraph',
        text: currentParagraph.trim()
      });
    }

    return tokens;
  }

  chunkMarkdownContent(content, maxChunkSize = 1000, overlapSize = 100) {
    const tokens = this.parseMarkdown(content);
    const chunks = [];
    let currentChunk = '';
    let currentHeading = '';
    let previousChunkEnd = '';

    for (const token of tokens) {
      if (token.type === 'heading') {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            heading: currentHeading,
            type: 'content'
          });
          previousChunkEnd = this.getOverlapText(currentChunk.trim(), overlapSize);
          currentChunk = '';
        }
        currentHeading = token.text;
        currentChunk += `${'#'.repeat(token.depth)} ${token.text}\n\n`;
      } else if (token.type === 'paragraph' || token.type === 'list' || token.type === 'code') {
        const tokenText = this.tokenToText(token);

        if (currentChunk.length + tokenText.length > maxChunkSize && currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            heading: currentHeading,
            type: 'content'
          });
          previousChunkEnd = this.getOverlapText(currentChunk.trim(), overlapSize);
          currentChunk = previousChunkEnd + tokenText + '\n\n';
        } else {
          currentChunk += tokenText + '\n\n';
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        heading: currentHeading,
        type: 'content'
      });
    }

    return chunks;
  }

  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) {
      return text + '\n\n';
    }

    const lastPart = text.slice(-overlapSize);
    const lastSentenceEnd = Math.max(
      lastPart.lastIndexOf('.'),
      lastPart.lastIndexOf('!'),
      lastPart.lastIndexOf('?'),
      lastPart.lastIndexOf('\n')
    );

    if (lastSentenceEnd > 0) {
      return text.slice(-(overlapSize - lastSentenceEnd)) + '\n\n';
    }

    return lastPart + '\n\n';
  }

  tokenToText(token) {
    switch (token.type) {
      case 'paragraph':
        return token.text;
      case 'list':
        return token.items.map(item => `- ${item.text}`).join('\n');
      case 'code':
        return `\`\`\`${token.lang || ''}\n${token.text}\n\`\`\``;
      case 'blockquote':
        return `> ${token.text}`;
      default:
        return token.raw || token.text || '';
    }
  }

  processAllDocuments() {
    const documents = this.readMarkdownFiles();
    const processedDocs = [];

    for (const doc of documents) {
      const chunks = this.chunkMarkdownContent(doc.content);

      chunks.forEach((chunk, index) => {
        processedDocs.push({
          id: `${doc.filename}_chunk_${index}`,
          filename: doc.filename,
          chunkIndex: index,
          heading: chunk.heading,
          content: chunk.content,
          metadata: {
            filename: doc.filename,
            path: doc.path,
            chunkIndex: index,
            heading: chunk.heading
          }
        });
      });
    }

    return processedDocs;
  }
}

module.exports = DocumentService;