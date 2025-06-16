# Quizlet Crawler Extension

A Chrome extension that helps you crawl questions and answers from ExamTopics and prepare them for Quizlet import.

## Features

- Automatically crawls questions and answers from ExamTopics
- Organizes data with clear question-answer format
- Exports data in a text format that's easy to import into Quizlet
- Supports multiple storage keys for different exam sets
- Auto-popup when visiting ExamTopics

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `gc-extension` folder

## How to Use

1. Visit any ExamTopics page
2. The extension will automatically pop up
3. Click "Crawl" to save the current question
4. Use the storage key selector to organize different sets of questions
5. Click "Download" to export your questions in text format
6. Import the text file into Quizlet:
   - Create a new study set in Quizlet
   - Click "Import from Word, Excel, Google Docs, etc."
   - Copy and paste the content from the text file

## Text Format

The exported text file will have the following format:
```
Answer
-------------------
Question text and choices
===================

Next question...
```

## Development

- Built with vanilla JavaScript
- Uses Chrome Extension Manifest V3
- No external dependencies required

## License

© 2025 Quizlet Crawler Developed by [thuongnn](https://github.com/thuongnn) 