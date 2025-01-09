const { test, expect, beforeEach, describe } = require('@playwright/test')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    // Nollataan tietokanta ja luodaan testikäyttäjä
    await request.post('http://localhost:3003/api/testing/reset')
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

  // Testataan kirjautumista oikealla salasanalla
  describe('Login', () => {
    test('succeeds with correct credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: 'username' }).fill('testuser')
      await page.getByRole('textbox', { name: 'password' }).fill('salasana')
      await page.getByRole('button', { name: /login/i }).click()

      await expect(page.getByText('logged in')).toBeVisible()
      await expect(page.getByRole('button', { name: /logout/i })).toBeVisible()
    })
    // Testataan kirjautumisen epäonnistuminen väärällä salasanalla
    test('fails with wrong credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: 'username' }).fill('testuser')
      await page.getByRole('textbox', { name: 'password' }).fill('salasana2')
      await page.getByRole('button', { name: /login/i }).click()

      // Tarkistetaan, että virheilmoitus näkyy
      const errorDiv = await page.locator('.error')
      await expect(errorDiv).toContainText('Wrong username or password')

      // Tarkistetaan, ettei käyttäjä ole kirjautunut
      await expect(page.getByText('logged in')).not.toBeVisible()
    })
  })
})
