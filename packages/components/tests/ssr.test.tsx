import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import {
  Button,
  Checkbox,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxLeadingIcon,
  ComboboxList,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Radio,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectLeadingIcon,
  SelectList,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "../src/index.ts";
import { BarChart, LineChart, PieChart } from "../src/charts.ts";

test("components render on the server", () => {
  const chartData = [
    { label: "First", value: 24 },
    { label: "Second", value: 36 },
  ];
  const markup = renderToStaticMarkup(
    <>
      <LineChart
        data={chartData}
        height={360}
        series={[{ dataKey: "value", label: "Value" }]}
        title="Line overview"
        xKey="label"
      />
      <BarChart
        data={chartData}
        series={[{ dataKey: "value", label: "Value" }]}
        title="Bar overview"
        xKey="label"
      />
      <PieChart data={chartData} nameKey="label" title="Pie overview" valueKey="value" />
      <Button>Save changes</Button>
      <label>
        <Checkbox defaultChecked name="notifications" />
        Enable notifications
      </label>
      <Combobox items={[{ label: "Mango", value: "mango" }]} name="fruit">
        <ComboboxInputGroup>
          <ComboboxLeadingIcon>Search</ComboboxLeadingIcon>
          <ComboboxInput aria-label="Fruit" placeholder="Search fruit" />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>No fruit found</ComboboxEmpty>
          <ComboboxList />
        </ComboboxContent>
      </Combobox>
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
        </DialogContent>
      </Dialog>
      <Drawer>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Drawer title</DrawerTitle>
        </DrawerContent>
      </Drawer>
      <Input aria-label="Name" name="name" />
      <Menu>
        <MenuTrigger>Open menu</MenuTrigger>
        <MenuContent>
          <MenuItem>Menu item</MenuItem>
        </MenuContent>
      </Menu>
      <RadioGroup aria-label="Frequency" defaultValue="daily" name="frequency">
        <Radio value="daily" />
      </RadioGroup>
      <Select items={[{ label: "Light", value: "light" }]} name="theme">
        <SelectTrigger aria-label="Theme">
          <SelectLeadingIcon>Theme</SelectLeadingIcon>
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectList>
            <SelectItem value="light">Light</SelectItem>
          </SelectList>
        </SelectContent>
      </Select>
      <Textarea aria-label="Message" name="message" />
      <label>
        <Switch defaultChecked name="compact-mode" />
        Compact mode
      </label>
    </>,
  );

  expect(markup).toContain('type="button"');
  expect(markup).toContain("Line overview");
  expect(markup).toContain("--eb-chart-height:360px");
  expect(markup).toContain('height="360"');
  expect(markup).toContain("Bar overview");
  expect(markup).toContain("Pie overview");
  expect(markup).toContain("Save changes");
  expect(markup).toContain("Enable notifications");
  expect(markup).toContain('aria-label="Fruit"');
  expect(markup).toContain('placeholder="Search fruit"');
  expect(markup).toContain('data-slot="leading-icon"');
  expect(markup).toContain("Open dialog");
  expect(markup).toContain("Open drawer");
  expect(markup).toContain('aria-label="Name"');
  expect(markup).toContain("Open menu");
  expect(markup).toContain('aria-label="Frequency"');
  expect(markup).toContain('name="name"');
  expect(markup).toContain('aria-label="Theme"');
  expect(markup).toContain("Select a theme");
  expect(markup).toContain('aria-label="Message"');
  expect(markup).toContain('name="message"');
  expect(markup).toContain("Compact mode");
});
