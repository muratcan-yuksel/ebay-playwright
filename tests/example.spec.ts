import { test, expect, firefox } from "@playwright/test";
require("dotenv").config();
const fs = require("fs");
const axios = require("axios");

test.describe("Logging in", () => {
  test("facebook login", async ({}) => {
    const browser = await firefox.launch();
    const context = await browser.newContext();

    const page = await context.newPage();
    await page.goto("https://www.quora.com");

    //click login by facebook
    await page
      .locator("div:nth-child(2) > .q-click-wrapper > .q-relative")
      .click();
    //enter email
    await page
      .getByPlaceholder("Email address or phone number")
      .fill(process.env.LOGIN_EMAIL);
    //enter password
    await page.getByPlaceholder("Password").fill(process.env.LOGIN_PASS);
    //click login button
    await page.click("button:has-text('Log in')");

    const cookies = await context.cookies();
    const cookieJson = JSON.stringify(cookies);

    fs.writeFileSync("cookies.json", cookieJson);

    await browser.close();
  });
});

test.describe("Navigating the site", () => {
  test("navigating to the home page", async ({}) => {
    test.setTimeout(120000);
    const browser = await firefox.launch();
    const context = await browser.newContext();

    const cookies = fs.readFileSync("cookies.json", "utf8");

    const deserializedCookies = JSON.parse(cookies);
    await context.addCookies(deserializedCookies);

    const page = await context.newPage();

    await page.goto(`https://quora.com`);

    await page.getByPlaceholder("Search Quora").fill("affiliate marketing");
    await page.locator("#selector-option-1 > div > div").click();

    await page.waitForLoadState("load");
    await page.waitForSelector(".dom_annotate_multifeed_topic");

    //gets all the questions in the main frame
    const links = await page.evaluate(() => {
      const element = document.querySelector(".dom_annotate_multifeed_topic");
      const links = Array.from(
        element.querySelectorAll(".puppeteer_test_link")
      );
      return links.map((el) => el.textContent);
    });
    console.log(links);
    //this will go to the cahtGPT as the question
    console.log(links[2]);
    //goes by +3
    // console.log(links[5]); is the 2nd question

    if (links[4] == "") {
      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        await page.getByRole("link", { name: links[3] }).click(),
      ]);
      //repeated code
      await newPage.waitForLoadState("load");
      await newPage.getByRole("button", { name: "Answer" }).first().click();
      await newPage.locator(".doc").fill("affiliate marketing");
      //close newpage
      await newPage.close();
      //reload the page
      await page.reload();
    } else {
      //work on the new tab using context
      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        await page.getByRole("link", { name: links[2] }).click(),
      ]);
      //repeated code
      await newPage.waitForLoadState("load");
      await newPage.getByRole("button", { name: "Answer" }).first().click();
      let jsonData;

      try {
        // const { sign, birthdate, timeOfBirth, birthLocation, name } = req.body;
        const apiUrl = "https://api.openai.com/v1/completions";
        const prompt = `${links[2]} `;
        const apiKey = process.env.OPENAI_KEY;
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        };
        const data = {
          model: "text-davinci-003",
          prompt: prompt,
          temperature: 1,
          max_tokens: 1200,
          echo: false,
        };

        const response = await axios.post(apiUrl, data, config);
        jsonData = response.data;

        // res.status(200).json(jsonData);
      } catch (error) {
        console.log(error);
        // return the error
        // res.status(500).json({ error: error.response.data });
      }
      await newPage.locator(".doc").fill(jsonData.choices[0].text);
      await newPage.getByRole("button", { name: "Post" }).click();
      //close newpage
      await newPage.close();
      //reload the page
      await page.reload();
    }
  });
});
