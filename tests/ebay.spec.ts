import { test, expect, firefox } from "@playwright/test";

test.describe("Navigation", () => {
  test("navigating to the home page", async ({}) => {
    //create browser
    const browser = await firefox.launch();
    //create context
    const context = await browser.newContext();
    //create page
    const page = await context.newPage();
    //go to the page
    await page.goto("https://www.ebay.com");
    //fill search bar
    await page.getByPlaceholder("Search for anything").fill("sneakers");
    //click search button
    await page.getByRole("button", { name: "Search" }).click();
    //wait for page load
    await page.waitForLoadState("load");
    //create an array of objects with the links and titles
    //get all elements with evaluate
    const links = await page.evaluate(() => {
      const elements = document.querySelectorAll(".s-item__info");
      //gets links
      const links = Array.from(elements).map(
        (el) => el.querySelector("a").href
      );
      //gets titles
      const titles = Array.from(elements).map(
        (el) => el.querySelector(".s-item__title")?.textContent
      );
      let myArr = [];
      for (let i = 0; i < titles.length; i++) {
        myArr.push({ title: titles[i], link: links[i] });
      }
      return myArr;
    });
    console.log(links);
    //click and open a new page
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      await page.getByText(links[2].title).click(),
    ]);
    //wait for page load
    await newPage.waitForLoadState("load");
    //get item condition
    const condition = await newPage.getByTestId("x-item-condition");
    console.log(await condition.textContent());
    //close new page
    await newPage.close();
  });
});
