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

import { Button, Classes, Tooltip } from "../../src";

/**
 * INTENTIONALLY FLAKY TESTS FOR CIRCLECI FLAKY TEST DETECTION
 * These tests simulate real-world tooltip timing issues that cause flakiness
 */
describe("<Tooltip> - Flaky Tests", () => {
    it("should show tooltip on hover with variable timing", async () => {
        const tooltipContent = "This is a tooltip";
        render(
            <Tooltip content={tooltipContent}>
                <Button>Hover me</Button>
            </Tooltip>
        );
        
        const button = screen.getByRole("button");
        
        // Hover over the button
        await userEvent.hover(button);
        
        // Variable delay simulation - sometimes tooltips take longer to appear
        const shouldDelayLonger = Math.random() > 0.3; // 70% chance of longer delay
        const hoverDelay = shouldDelayLonger ? Math.random() * 150 + 50 : Math.random() * 50;
        
        await new Promise(resolve => setTimeout(resolve, hoverDelay));
        
        // Try to find the tooltip - timing dependent
        try {
            await waitFor(() => {
                const tooltip = screen.getByText(tooltipContent);
                expect(tooltip).to.exist;
            }, { timeout: 100 });
        } catch {
            // Sometimes tooltip doesn't appear in time due to animation delays
            // This causes flakiness in real applications
            const tooltip = screen.queryByText(tooltipContent);
            expect(tooltip).to.exist; // Will fail ~30% of the time
        }
    });

    it("should hide tooltip on mouse leave with race conditions", async () => {
        const tooltipContent = "Disappearing tooltip";
        render(
            <Tooltip content={tooltipContent}>
                <Button>Hover and leave</Button>
            </Tooltip>
        );
        
        const button = screen.getByRole("button");
        
        // Show tooltip
        await userEvent.hover(button);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify tooltip is shown
        let tooltip = screen.queryByText(tooltipContent);
        expect(tooltip).to.exist;
        
        // Leave quickly
        await userEvent.unhover(button);
        
        // Race condition: sometimes we check before hide animation completes
        const quickCheck = Math.random() > 0.3; // 70% chance of quick check
        const hideDelay = quickCheck ? 20 : 150;
        
        await new Promise(resolve => setTimeout(resolve, hideDelay));
        
        // Check if tooltip is hidden - timing dependent
        tooltip = screen.queryByText(tooltipContent);
        expect(tooltip).to.not.exist; // Flaky due to animation timing
    });

    it("should handle multiple rapid hover events", async () => {
        const tooltipContent = "Rapid hover tooltip";
        render(
            <Tooltip content={tooltipContent}>
                <Button>Rapid hover target</Button>
            </Tooltip>
        );
        
        const button = screen.getByRole("button");
        
        // Simulate rapid mouse movements that happen in real usage
        const hoverCount = Math.floor(Math.random() * 5) + 3; // 3-7 rapid hovers
        
        for (let i = 0; i < hoverCount; i++) {
            if (i % 2 === 0) {
                await userEvent.hover(button);
            } else {
                await userEvent.unhover(button);
            }
            
            // Random micro-delays
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
        }
        
        // Final hover
        await userEvent.hover(button);
        
        // Wait variable time based on how many rapid hovers occurred
        const stabilizationTime = hoverCount > 5 ? 200 : 50;
        await new Promise(resolve => setTimeout(resolve, stabilizationTime));
        
        // Tooltip state is unpredictable after rapid events
        const tooltip = screen.queryByText(tooltipContent);
        const shouldBeVisible = hoverCount <= 4; // Arbitrary logic that creates flakiness
        
        if (shouldBeVisible) {
            expect(tooltip).to.exist;
        } else {
            expect(tooltip).to.exist; // Will sometimes fail due to event chaos
        }
    });

    it("should handle tooltip positioning with viewport calculations", async () => {
        const tooltipContent = "Positioned tooltip";
        
        // Mock window dimensions that sometimes change
        const originalInnerWidth = window.innerWidth;
        const originalInnerHeight = window.innerHeight;
        
        // Randomly modify viewport to simulate real browser behavior
        const shouldSimulateResize = Math.random() > 0.3;
        if (shouldSimulateResize) {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 800 + Math.random() * 400
            });
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: 600 + Math.random() * 400
            });
        }
        
        render(
            <Tooltip content={tooltipContent} position="top">
                <Button style={{ marginTop: "300px", marginLeft: "300px" }}>
                    Edge positioned button
                </Button>
            </Tooltip>
        );
        
        const button = screen.getByRole("button");
        await userEvent.hover(button);
        
        // Wait for positioning calculations
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        try {
            await waitFor(() => {
                const tooltip = screen.getByText(tooltipContent);
                expect(tooltip).to.exist;
                
                // Check if tooltip has positioning classes (flaky due to viewport changes)
                const tooltipElement = tooltip.closest(`.${Classes.TOOLTIP}`);
                const hasPositioning = tooltipElement?.classList.contains(Classes.TOOLTIP);
                expect(hasPositioning).to.be.true;
            }, { timeout: 150 });
        } catch {
            // Positioning calculations sometimes fail with viewport changes
            expect(false).to.be.true; // Intentional failure ~30% of the time
        } finally {
            // Restore original viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: originalInnerWidth
            });
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: originalInnerHeight
            });
        }
    });

    it("should handle tooltip content updates with async operations", async () => {
        let tooltipContent = "Initial content";
        
        const { rerender } = render(
            <Tooltip content={tooltipContent}>
                <Button>Dynamic content</Button>
            </Tooltip>
        );
        
        const button = screen.getByRole("button");
        await userEvent.hover(button);
        
        // Verify initial content
        await waitFor(() => {
            expect(screen.getByText("Initial content")).to.exist;
        });
        
        // Simulate async content update (like API call)
        const updateDelay = Math.random() * 100;
        const updateSuccess = Math.random() > 0.3; // 70% success rate
        
        setTimeout(() => {
            if (updateSuccess) {
                tooltipContent = "Updated content";
                rerender(
                    <Tooltip content={tooltipContent}>
                        <Button>Dynamic content</Button>
                    </Tooltip>
                );
            }
            // If update fails, content stays the same
        }, updateDelay);
        
        // Wait for potential update
        await new Promise(resolve => setTimeout(resolve, updateDelay + 50));
        
        // Check for updated content - will be flaky based on update success
        const updatedTooltip = screen.queryByText("Updated content");
        expect(updatedTooltip).to.exist; // Fails ~30% when update "fails"
    });

    it("should handle keyboard navigation with focus timing", async () => {
        render(
            <div>
                <Tooltip content="First tooltip">
                    <Button>First button</Button>
                </Tooltip>
                <Tooltip content="Second tooltip">
                    <Button>Second button</Button>
                </Tooltip>
            </div>
        );
        
        const firstButton = screen.getByText("First button");
        const secondButton = screen.getByText("Second button");
        
        // Focus first button
        firstButton.focus();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Tab to second button with variable timing
        await userEvent.tab();
        
        // Race condition: sometimes focus change happens faster than tooltip updates
        const focusCheckDelay = Math.random() > 0.3 ? 100 : 20;
        await new Promise(resolve => setTimeout(resolve, focusCheckDelay));
        
        // Check if second button is focused and tooltip appears
        const isSecondFocused = document.activeElement === secondButton;
        expect(isSecondFocused).to.be.true;
        
        // Tooltip appearance is timing-dependent with keyboard navigation
        const secondTooltip = screen.queryByText("Second tooltip");
        const shouldShowTooltip = focusCheckDelay > 50;
        
        if (shouldShowTooltip) {
            expect(secondTooltip).to.exist;
        } else {
            expect(secondTooltip).to.exist; // Fails when timing is too quick
        }
    });
});
