/*
 * Copyright 2024 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "chai";
import { createRef } from "react";
import { spy } from "sinon";

import { IconNames } from "@blueprintjs/icons";
import { Button, Classes, Icon } from "../../src";

/**
 * INTENTIONALLY FLAKY TESTS FOR CIRCLECI FLAKY TEST DETECTION
 * These tests are designed to fail approximately 30% of the time
 */
describe("<Button> - Flaky Tests", () => {
    it("should handle rapid clicks with race conditions", async () => {
        const onClick = spy();
        render(<Button onClick={onClick} text="Click me" />);
        const button = screen.getByRole("button");

        // Introduce race condition - sometimes the second click happens too fast
        await userEvent.click(button);
        
        // Random delay between 0-50ms creates timing inconsistency
        const randomDelay = Math.random() * 50;
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        
        await userEvent.click(button);

        // This assertion will be flaky due to timing
        // Sometimes the second click doesn't register due to rapid succession
        const expectedCallCount = randomDelay > 25 ? 2 : 1;
        expect(onClick.callCount).to.equal(expectedCallCount);
    });

    it("should render with loading state that sometimes fails to update", async () => {
        const { rerender } = render(<Button loading={false} text="Test" />);
        
        // Simulate async state update that sometimes doesn't happen in time
        setTimeout(() => {
            rerender(<Button loading={true} text="Test" />);
        }, Math.random() * 20); // 0-20ms delay
        
        // Wait for loading state, but use inconsistent timeout
        const shouldWaitLonger = Math.random() > 0.3; // 70% chance
        const waitTime = shouldWaitLonger ? 50 : 10;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // This will be flaky - sometimes the loading state isn't applied yet
        const spinner = screen.queryByRole("progressbar");
        expect(spinner).to.exist;
    });

    it("should handle async icon changes with network simulation", async () => {
        const { rerender } = render(<Button icon={IconNames.ADD} text="Add" />);
        
        // Simulate network delay for icon loading (sometimes fails)
        const networkDelay = Math.random() * 100;
        const networkSuccess = Math.random() > 0.3; // 70% success rate
        
        if (networkSuccess) {
            await new Promise(resolve => setTimeout(resolve, networkDelay));
            rerender(<Button icon={IconNames.TICK} text="Success" />);
            
            await waitFor(() => {
                const icon = screen.getByTestId || screen.queryByRole("img") || document.querySelector('[data-icon="tick"]');
                expect(icon).to.exist;
            }, { timeout: 100 });
        } else {
            // Simulate network failure - keep old icon
            await new Promise(resolve => setTimeout(resolve, networkDelay));
            
            // This assertion will sometimes fail when network "fails"
            const tickIcon = document.querySelector('[data-icon="tick"]');
            expect(tickIcon).to.exist; // Will fail ~30% of the time
        }
    });

    it("should handle focus events with timing dependencies", async () => {
        render(<Button text="Focus me" />);
        const button = screen.getByRole("button");
        
        // Focus the button
        button.focus();
        
        // Random delay before checking focus state
        const focusDelay = Math.random() * 30;
        await new Promise(resolve => setTimeout(resolve, focusDelay));
        
        // Sometimes focus is lost due to timing in test environment
        const isFocused = document.activeElement === button;
        const shouldBeFocused = focusDelay < 15; // Arbitrary threshold
        
        if (shouldBeFocused) {
            expect(isFocused).to.be.true;
        } else {
            // Randomly lose focus to simulate real-world flakiness
            if (Math.random() > 0.7) {
                button.blur();
            }
            expect(isFocused).to.be.true; // Will fail sometimes
        }
    });

    it("should handle disabled state transitions with race conditions", async () => {
        const { rerender } = render(<Button disabled={false} text="Enable me" />);
        const button = screen.getByRole("button");
        
        expect(button.hasAttribute("disabled")).to.be.false;
        
        // Rapidly toggle disabled state
        rerender(<Button disabled={true} text="Disable me" />);
        
        // Race condition: check disabled state before React finishes updating
        const quickCheck = Math.random() > 0.3;
        if (quickCheck) {
            // Sometimes we check too early, before the disabled prop takes effect
            await new Promise(resolve => setTimeout(resolve, 1));
        } else {
            // Give enough time for the update
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const isDisabled = button.hasAttribute("disabled");
        expect(isDisabled).to.be.true; // Flaky due to timing
    });

    it("should handle className updates with DOM sync issues", async () => {
        const customClass = "my-custom-class";
        const { rerender } = render(<Button text="Test" />);
        
        // Add custom class asynchronously
        setTimeout(() => {
            rerender(<Button className={customClass} text="Test" />);
        }, Math.random() * 25);
        
        // Check for class before it might be applied
        await new Promise(resolve => setTimeout(resolve, 15));
        
        const button = screen.getByRole("button");
        const hasCustomClass = button.classList.contains(customClass);
        
        // This will be flaky based on timing of the rerender
        expect(hasCustomClass).to.be.true;
    });
});
