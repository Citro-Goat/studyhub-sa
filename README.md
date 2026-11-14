# StudyHub SA — Grade 10–12 Resource Website

A responsive React website for South African high-school learners. It includes Supabase email/password authentication, protected resource browsing, private PDF storage, and an administrator upload page.

## 1. Install the tools

1. Install [Node.js LTS](https://nodejs.org/).
2. Install [Visual Studio Code](https://code.visualstudio.com/).
3. Download and unzip this project.
4. In VS Code choose **File → Open Folder** and open `studyhub-sa`.

## 2. Run the website locally

Open **Terminal → New Terminal** in VS Code and run:

```bash
npm install
```

Then start the development server:

```bash
npm run dev
```

Open the local URL printed in the terminal (usually `http://localhost:5173`).

The design can be previewed before connecting Supabase. Demo resource cards are sample listings only; they do not contain real PDF files.

## 3. Create the Supabase backend

1. Visit [https://supabase.com](https://supabase.com) and create a project.
2. In the Supabase project open **SQL Editor → New query**.
3. Open `supabase/schema.sql` in VS Code, copy all of it, paste it into the SQL Editor and click **Run**.
4. In Supabase go to **Project Settings → API** (or **Connect**) and copy the Project URL and publishable/anon key. Never use a `service_role` or secret key in frontend code.
5. In the project folder duplicate `.env.example` and rename the copy to `.env`.
6. Add your own values:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

7. Stop and restart the Vite server after changing `.env` (`Ctrl+C`, then `npm run dev`).

## 4. Create your administrator account

1. In the website create an account using your own email.
2. In Supabase open **Authentication → Users** and copy the UUID for your account.
3. In **SQL Editor**, run this command after replacing the example UUID:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-AUTH-USER-UUID';
```

4. Sign out of StudyHub SA and sign in again. You should now see the Upload tab.
5. Upload PDFs using the admin form. Select the subject, grade, year, term and resource type.

Do not give administrator access to ordinary learner accounts.

## 5. Add your resources

Upload your own PDF question papers, memorandums and notes through the administrator page. Each resource is labelled by:
- Grade 10, 11 or 12
- Mathematics, Mathematical Literacy, Physical Sciences, Accounting or Life Sciences
- Question Paper, Memorandum or Notes
- Year and term

Use only resources you have permission to distribute. Check that uploaded PDFs are correct and readable.

## 6. Publish the website with Vercel

1. Create a [GitHub](https://github.com/) account if you do not already have one.
2. Create a new GitHub repository.
3. In VS Code open the terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial StudyHub SA website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/studyhub-sa.git
git push -u origin main
```

Replace the GitHub URL with your repository URL. Do not commit your `.env` file. It is ignored by Vite's usual environment conventions only if you add it to `.gitignore`; create `.gitignore` containing:

```gitignore
node_modules
dist
.env
.env.*
!.env.example
```

4. Visit [https://vercel.com](https://vercel.com), sign in with GitHub and choose **Add New → Project**.
5. Import your `studyhub-sa` repository. Vercel should detect Vite automatically.
6. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click **Deploy**. Vercel will give you a public website URL.
8. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel URL and add that URL to the Redirect URLs list. If you later add a custom domain, add it there too.

## 7. Before sharing your website

- Test account creation, sign-in and sign-out.
- Test with a normal learner account: it must not see the upload page.
- Test an admin account uploading and opening a PDF.
- Check the private bucket and RLS policies remain enabled.
- Add a password reset flow and terms/privacy pages before a public launch.
- Configure email confirmation and SMTP in Supabase before real-world use.
- Set a sensible storage limit and monitor Supabase usage.

## Important security notes

- The frontend uses only the Supabase publishable/anon key. Never put a service-role key in React, `.env` variables prefixed with `VITE_`, GitHub, or the browser.
- The SQL policies protect resources and files so only signed-in users can read them and only admins can upload/manage them.
- The PDF bucket is private. The app creates short-lived signed links after a learner signs in.
- This is a starter MVP, not a complete production school-management platform. Have the database policies and deployment reviewed before collecting learner data at scale.
