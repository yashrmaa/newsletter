# 📝 Setting Up Giscus Feedback System

The PR includes Giscus integration for article feedback, but it needs to be configured with your repository details.

## 🚀 Quick Setup

### 1. Enable GitHub Discussions
Go to your repository settings:
- Navigate to: https://github.com/yashrmaa/newsletter/settings
- Scroll to "Features" section
- ✅ Enable "Discussions"

### 2. Get Your Giscus Configuration
Visit: https://giscus.app/

Fill in these details:
- **Repository:** `yashrmaa/newsletter`
- **Page ↔️ Discussions Mapping:** Choose "Discussion title contains page `<title>`"
- **Discussion Category:** Select "Announcements" 
- **Features:** Enable reactions

### 3. Copy Configuration Values
Giscus will generate a script tag with these values:
- `data-repo="yashrmaa/newsletter"`
- `data-repo-id="[YOUR_REPO_ID]"`
- `data-category-id="[YOUR_CATEGORY_ID]"`

### 4. Update Template
Edit `templates/newsletter/base.hbs` and replace the placeholders:

```handlebars
<script src="https://giscus.app/client.js"
        data-repo="yashrmaa/newsletter"
        data-repo-id="[PASTE_YOUR_REPO_ID]"
        data-category="Announcements"
        data-category-id="[PASTE_YOUR_CATEGORY_ID]"
        data-mapping="specific"
        data-term="{{id}}"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="light"
        data-lang="en"
        crossorigin="anonymous"
        async>
</script>
```

## 💡 How Feedback Works

Once configured:
1. **Each article gets a discussion thread** - Identified by article ID
2. **Readers can react** - 👍 👎 ❤️ 🚀 reactions on articles
3. **Comments enabled** - Readers can leave detailed feedback
4. **Feedback influences curation** - The system fetches reactions via GitHub API and adjusts future article selection

## 🔧 Testing Feedback

After setup:
1. Generate a newsletter: `npm run generate`
2. Open the HTML output: `open ./output/newsletter.html`
3. You should see comment widgets under each article
4. Try leaving a reaction or comment
5. Check GitHub Discussions to see the feedback

## 📊 Feedback Processing

The feedback system:
- Fetches reactions from previous newsletters
- Updates user preferences based on feedback
- Influences article scoring in future curations
- Stored in `data/curated-articles.json` for tracking

## 🎯 Alternative: Simple Feedback

If you don't want to set up Giscus, you can use simpler feedback methods:
1. **Email feedback**: Add a mailto link
2. **GitHub Issues**: Link to create an issue
3. **Survey form**: Embed a Google Form or Typeform

Would you like me to implement one of these alternatives instead?