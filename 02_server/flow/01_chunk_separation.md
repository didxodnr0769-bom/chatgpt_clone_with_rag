# 청크 분리 방식 (Chunk Separation)

## 개요
문서를 RAG에서 사용할 수 있도록 작은 단위로 분할하는 프로세스입니다. 마크다운 문서를 읽어서 의미있는 청크로 나누고, 각 청크에 메타데이터를 추가합니다.

## 구현 위치
- **파일**: `services/documentService.js`
- **주요 클래스**: `DocumentService`

## 주요 메서드

### 1. `processAllDocuments()`
전체 문서 처리의 진입점입니다.

```javascript
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
```

### 2. `readMarkdownFiles()`
docs 폴더에서 마크다운 파일들을 읽어옵니다.

```javascript
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
```

### 3. `chunkMarkdownContent(content, maxChunkSize = 1000)`
마크다운 내용을 지정된 크기로 청크를 나눕니다.

```javascript
chunkMarkdownContent(content, maxChunkSize = 1000) {
  const tokens = this.parseMarkdown(content);
  const chunks = [];
  let currentChunk = '';
  let currentHeading = '';

  for (const token of tokens) {
    if (token.type === 'heading') {
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          heading: currentHeading,
          type: 'content'
        });
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
        currentChunk = tokenText + '\n\n';
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
```

### 4. `parseMarkdown(content)`
마크다운 내용을 토큰으로 파싱합니다.

```javascript
simpleMarkdownParse(content) {
  const lines = content.split('\n');
  const tokens = [];
  let currentParagraph = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('#')) {
      // 헤딩 처리
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
      // 코드 블록 처리
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
      // 리스트 처리
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
      // 빈 줄 처리
      if (currentParagraph) {
        tokens.push({
          type: 'paragraph',
          text: currentParagraph.trim()
        });
        currentParagraph = '';
      }
    } else {
      // 일반 텍스트
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
```

## 청크 분리 전략

### 1. 헤딩 기반 분리
- 마크다운의 헤딩(#, ##, ###)을 기준으로 섹션을 나눕니다
- 각 헤딩은 새로운 청크의 시작점이 됩니다
- 헤딩 정보는 메타데이터로 보존됩니다

### 2. 크기 기반 분리
- 기본 최대 청크 크기: 1000자
- 청크가 최대 크기를 초과하면 새로운 청크로 분할
- 토큰 단위로 분할하여 의미가 끊기지 않도록 합니다

### 3. 토큰 타입별 처리
- **헤딩**: 새로운 섹션의 시작으로 처리
- **문단**: 일반 텍스트 내용
- **코드 블록**: 언어 정보와 함께 보존
- **리스트**: 리스트 아이템으로 구조화

## 생성되는 청크 구조

```javascript
{
  id: "filename.md_chunk_0",           // 유니크 식별자
  filename: "filename.md",             // 원본 파일명
  chunkIndex: 0,                       // 청크 순서
  heading: "섹션 제목",                 // 해당 섹션의 헤딩
  content: "실제 청크 내용...",         // 청크의 텍스트 내용
  metadata: {
    filename: "filename.md",
    path: "/path/to/file.md",
    chunkIndex: 0,
    heading: "섹션 제목"
  }
}
```

## 장점

1. **컨텍스트 보존**: 헤딩 정보를 통해 문서의 구조적 컨텍스트 유지
2. **적절한 크기**: 1000자 제한으로 임베딩과 검색에 최적화
3. **메타데이터 풍부**: 파일명, 경로, 헤딩 등 추적 가능한 정보 포함
4. **유연한 처리**: 다양한 마크다운 요소 지원 (헤딩, 코드, 리스트)