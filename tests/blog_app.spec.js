const { test, expect, beforeEach, describe } = require('@playwright/test')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    // Nollataan tietokanta ja luodaan testikäyttäjä
    console.log('Resetting database...')
    await request.post('http://localhost:3003/api/testing/reset')
    console.log('Database reset done!')

    await request.post('http://localhost:3003/api/users', {
      data: {
        name: 'Test Person',
        username: 'testuser',
        password: 'salasana',
      },
    })

    // Siirrytään sovelluksen etusivulle
    await page.goto('http://localhost:5173')
  })

  test('Login form is shown', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
  })

  describe('Login', () => {
    test('succeeds with correct credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: 'username' }).fill('testuser')
      await page.getByRole('textbox', { name: 'password' }).fill('salasana')
      await page.getByRole('button', { name: /login/i }).click()

      await expect(page.getByText('logged in')).toBeVisible()
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
    })

    test('fails with wrong credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: 'username' }).fill('testuser')
      await page.getByRole('textbox', { name: 'password' }).fill('wrongpassword')
      await page.getByRole('button', { name: /login/i }).click()

      const errorDiv = await page.locator('.error')
      await expect(errorDiv).toContainText('Wrong username or password')

      await expect(page.getByText('logged in')).not.toBeVisible()
    })
  })
})

describe('When logged in', () => {
  beforeEach(async ({ page, request }) => {
    console.log('Resetting database before login...')
    await request.post('http://localhost:3003/api/testing/reset')

    await request.post('http://localhost:3003/api/users', {
      data: {
        name: 'Test User',
        username: 'testuser',
        password: 'salasana',
      },
    })

    await page.goto('http://localhost:5173')
    await page.getByRole('textbox', { name: 'username' }).fill('testuser')
    await page.getByRole('textbox', { name: 'password' }).fill('salasana')
    await page.getByRole('button', { name: /login/i }).click()
  })

  test('a new blog can be created', async ({ page }) => {
    await page.getByRole('button', { name: /create new blog/i }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Playwright Blog')
    await page.getByRole('textbox', { name: 'Author' }).fill('Test Author')
    await page.getByRole('textbox', { name: 'URL' }).fill('http://example.com')
    await page.getByRole('button', { name: /save/i }).click()

    const blogElement = page.locator('.blogTitleAuthor', { hasText: 'Playwright Blog Test Author' })
    await expect(blogElement).toBeVisible()
  })

  test('a blog can be deleted by its creator', async ({ page }) => {
    await page.getByRole('button', { name: /view/i }).first().click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /remove/i }).click()

    await expect(page.getByText('Playwright Blog')).not.toBeVisible()
  })

  test('only the creator sees the delete button', async ({ page, request }) => {
    await page.getByRole('button', { name: /create new blog/i }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Playwright Blog')
    await page.getByRole('textbox', { name: 'Author' }).fill('Test Author')
    await page.getByRole('textbox', { name: 'URL' }).fill('http://example.com')
    await page.getByRole('button', { name: /save/i }).click()

    await page.getByRole('button', { name: /logout/i }).click()

    await request.post('http://localhost:3003/api/users', {
      data: {
        name: 'Another User',
        username: 'anotheruser',
        password: 'salasana',
      },
    })

    await page.getByRole('textbox', { name: 'username' }).fill('anotheruser')
    await page.getByRole('textbox', { name: 'password' }).fill('salasana')
    await page.getByRole('button', { name: /login/i }).click()

    await expect(page.getByRole('button', { name: /remove/i })).not.toBeVisible()
  })

  test('blogs are sorted by likes', async ({ page }) => {
    await page.getByRole('button', { name: /create new blog/i }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Most Liked Blog')
    await page.getByRole('textbox', { name: 'Author' }).fill('Popular Author')
    await page.getByRole('textbox', { name: 'URL' }).fill('http://example.com')
    await page.getByRole('button', { name: /save/i }).click()

    await page.getByRole('button', { name: /create new blog/i }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Least Liked Blog')
    await page.getByRole('textbox', { name: 'Author' }).fill('Unpopular Author')
    await page.getByRole('textbox', { name: 'URL' }).fill('http://example2.com')
    await page.getByRole('button', { name: /save/i }).click()

    await page.getByRole('button', { name: /view/i }).first().click()
    await page.getByRole('button', { name: /like/i }).click()
    await page.getByRole('button', { name: /like/i }).click()

    const blogs = await page.locator('.blogTitleAuthor').allTextContents()
    expect(blogs[0]).toContain('Most Liked Blog')
    expect(blogs[1]).toContain('Least Liked Blog')
  })
})