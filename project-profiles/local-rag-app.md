# Local RAG App Profile

Use this profile for apps that query local/private documents, codebases, notes, work docs, PDFs, scraped docs, or internal knowledge.

## Target user

A developer, researcher, or power user who needs grounded answers from private material.

## Job-to-be-done

This app is for someone with too much private knowledge scattered across files, docs, and repos
who is trying to find accurate answers quickly
but keeps struggling with search friction, missing context, and hallucinated summaries,
so this app helps them ask questions and receive source-grounded answers with citations and confidence notes.

## Product wedge

This is not a generic chatbot.

It is a trustworthy local knowledge workbench.

## Enemy

- hallucinated answers
- giant context dumps
- unclear sources
- black-box retrieval
- stale indexes
- no confidence notes
- answers that cannot be verified

## Core loop

```text
User asks a question
→ app retrieves the smallest useful source set
→ app answers with citations and uncertainty
→ user opens sources or asks a follow-up
→ the knowledge base becomes more useful
```

## Magic moment

The user asks a real question and gets a concise answer with the exact source snippets that prove it.

## Should feel like

- trustworthy
- local-first
- fast
- source-grounded
- technical but readable
- more like a research workbench than a chatbot toy

## Should avoid

- unsourced answers
- vague summaries
- pretending confidence
- hiding retrieval details
- dumping too much context
- overcomplicated setup before first value

## Must support eventually

- source citations
- document refresh
- folder/repo indexing
- filters
- answer confidence
- "I do not know" responses
- source preview
- failed-answer debugging
- local model support if needed

## Not building yet

- multi-user sharing
- enterprise permissions
- marketplace connectors
- complex document editing
- automatic public web ingestion unless core use requires it

## Great first slice

Index a small local folder and answer questions with cited source snippets.

## Product rubric additions

Score:

- Are answers grounded?
- Are sources visible?
- Is uncertainty honest?
- Does retrieval find the right chunks?
- Does this reduce time spent searching?
- Would I trust this for work?

## Architecture notes

Good stack options:

- Python backend
- FastAPI or simple local server
- SQLite for metadata
- Chroma / FAISS / LanceDB for vectors
- Ollama or local embeddings where possible
- Separate ingestion, retrieval, answer, and citation modules

## Suggested first current mission

Build a local proof-of-concept that indexes a small folder of markdown/text files and answers a question with source-cited snippets.
