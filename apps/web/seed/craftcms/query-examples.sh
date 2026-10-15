#!/bin/bash
# Query Examples for Feadship Extracted Data
# Usage: bash query-examples.sh

echo "🔍 Feadship Data Query Examples"
echo "================================"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install it with: sudo pacman -S jq"
    echo "These examples require jq for JSON parsing."
    exit 1
fi

echo "📊 Basic Statistics"
echo "-------------------"
echo "Total yacht records: $(wc -l < yacht-data.jsonl)"
echo "Total news articles: $(wc -l < news-articles.jsonl)"
echo ""

echo "🔢 Hull Numbers"
echo "---------------"
echo "Unique hull numbers:"
cat yacht-data.jsonl | jq -r 'select(._type == null) | .hullNumber' | grep -v null | sort -u | wc -l
echo ""
echo "First 10 hull numbers with yacht names:"
cat yacht-data.jsonl | jq -r 'select(._type == null and .hullNumber != null) | "\(.hullNumber)\t\(.currentName // .title)"' | sort -u -t$'\t' -k1 | head -10
echo ""

echo "📅 Yachts by Year"
echo "-----------------"
cat yacht-data.jsonl | jq -r 'select(._type == null and .year != null) | .year' | sort | uniq -c | tail -10
echo ""

echo "📏 Yacht Length Distribution"
echo "----------------------------"
echo "Yachts over 100m:"
cat yacht-data.jsonl | jq -r 'select(._type == null and .length != null and (.length | tonumber) > 100) | "\(.length)m - \(.currentName // .title) (hull \(.hullNumber))"' | sort -rn | head -10
echo ""

echo "🌐 Third-Party Data"
echo "-------------------"
echo "Yachts with third-party data:"
cat yacht-data.jsonl | jq -r 'select(._type == null and (.thirdPartyData | length) > 0)' | wc -l
echo ""

echo "📝 Resale Data"
echo "--------------"
echo "Resale brochure requests:"
cat yacht-data.jsonl | jq -r 'select(._type == "resale_brochure_request")' | wc -l
echo "Resale inquiries:"
cat yacht-data.jsonl | jq -r 'select(._type == "resale_inquiry")' | wc -l
echo ""

echo "📰 News Articles by Year"
echo "------------------------"
cat news-articles.jsonl | jq -r '.postDate' | cut -d'-' -f1 | sort | uniq -c | tail -10
echo ""

echo "🖼️  Articles with Assets"
echo "-----------------------"
echo "Articles with related images/assets:"
cat news-articles.jsonl | jq -r 'select((.relatedAssets | length) > 0)' | wc -l
echo ""

echo "✅ Query Examples Complete!"
echo ""
echo "💡 Advanced Queries:"
echo "-------------------"
echo ""
echo "# Get all hull numbers to a file:"
echo "cat yacht-data.jsonl | jq -r 'select(._type == null) | .hullNumber' | grep -v null | sort -u > hull-numbers.txt"
echo ""
echo "# Find a specific yacht by hull number:"
echo "cat yacht-data.jsonl | jq 'select(.hullNumber == \"698\")' | head -1 | jq ."
echo ""
echo "# Get yachts delivered after 2020:"
echo "cat yacht-data.jsonl | jq 'select(.year != null and (.year | tonumber) > 2020) | {hull: .hullNumber, name: .currentName, year: .year}'"
echo ""
echo "# Find articles about a specific yacht:"
echo "cat news-articles.jsonl | jq 'select(.title | test(\"Letani\"; \"i\"))'"
echo ""
echo "# Export to CSV (hull numbers):"
echo "echo 'hull_number,yacht_name,year,length' > yachts.csv"
echo "cat yacht-data.jsonl | jq -r 'select(._type == null and .hullNumber != null) | [.hullNumber, (.currentName // .title), .year, .length] | @csv' >> yachts.csv"
echo ""
