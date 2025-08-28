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
import { spy } from "sinon";

import { Button, Classes, Dialog } from "../../src";

/**
 * INTENTIONALLY FLAKY TESTS FOR CIRCLECI FLAKY TEST DETECTION
 * These tests simulate real-world dialog timing and animation issues
 */
describe("<Dialog> - Flaky Tests", () => {
    it("should open dialog with animation timing issues", async () => {
        const onClose = spy();
        const { rerender } = render(
            <Dialog isOpen={false} onClose={onClose} title="Test Dialog">
                <div>Dialog content</div>
            </Dialog>
        );
        
        // Open the dialog
        rerender(
            <Dialog isOpen={true} onClose={onClose} title="Test Dialog">
                <div>Dialog content</div>
            </Dialog>
        );
        
        // Variable delay to simulate real animation timing
        const animationDelay = Math.random() * 200 + 50; // 50-250ms
        const shouldWaitFull = Math.random() > 0.3; // 70% chance
        
        if (shouldWaitFull) {
            await new Promise(resolve => setTimeout(resolve, animationDelay));
        } else {
            // Sometimes we check too early during animation
            await new Promise(resolve => setTimeout(resolve, animationDelay * 0.3));
        }
        
        try {
            await waitFor(() => {
                const dialog = screen.getByRole("dialog");
                expect(dialog).to.exist;
                
                // Check if dialog is fully visible (depends on animation completion)
                const dialogContainer = dialog.closest(`.${Classes.DIALOG_CONTAINER}`);
                expect(dialogContainer).to.exist;
            }, { timeout: 100 });
        } catch {
            // Animation not complete - causes flakiness
            const dialog = screen.queryByRole("dialog");
            expect(dialog).to.exist; // Fails ~30% when checked mid-animation
        }
    });

    it("should handle ESC key press with focus management", async () => {
        const onClose = spy();
        render(
            <Dialog isOpen={true} onClose={onClose} title="Closeable Dialog">
                <div>Press ESC to close</div>
                <Button>Focus me</Button>
            </Dialog>
        );
        
        // Wait for dialog to be ready
        await waitFor(() => {
            expect(screen.getByRole("dialog")).to.exist;
        });
        
        // Sometimes focus the button inside dialog first
        const shouldFocusButton = Math.random() > 0.5;
        if (shouldFocusButton) {
            const button = screen.getByText("Focus me");
            button.focus();
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        // Press ESC with variable timing
        await userEvent.keyboard("{Escape}");
        
        // Race condition: check onClose call before event propagation completes
        const checkDelay = Math.random() > 0.3 ? 50 : 5;
        await new Promise(resolve => setTimeout(resolve, checkDelay));
        
        // ESC handling is timing-dependent with focus management
        const expectedCalls = checkDelay > 25 ? 1 : 0;
        expect(onClose.callCount).to.equal(expectedCalls); // Flaky based on timing
    });

    it("should handle backdrop clicks with event propagation", async () => {
        const onClose = spy();
        render(
            <Dialog isOpen={true} onClose={onClose} title="Backdrop Dialog">
                <div>Click backdrop to close</div>
            </Dialog>
        );
        
        await waitFor(() => {
            expect(screen.getByRole("dialog")).to.exist;
        });
        
        // Find the backdrop (overlay)
        const backdrop = document.querySelector(`.${Classes.OVERLAY_BACKDROP}`);
        expect(backdrop).to.exist;
        
        // Click backdrop with timing variations
        const clickTarget = backdrop as HTMLElement;
        
        // Sometimes double-click happens in real usage
        const shouldDoubleClick = Math.random() > 0.7; // 30% chance
        
        if (shouldDoubleClick) {
            // Double click can cause event handling issues
            await userEvent.click(clickTarget);
            await new Promise(resolve => setTimeout(resolve, 5));
            await userEvent.click(clickTarget);
        } else {
            await userEvent.click(clickTarget);
        }
        
        // Wait variable time for event handling
        const eventDelay = Math.random() * 50 + 10;
        await new Promise(resolve => setTimeout(resolve, eventDelay));
        
        // Event propagation timing affects onClose calls
        const expectedCalls = shouldDoubleClick ? 2 : 1;
        const actualCalls = onClose.callCount;
        
        // Sometimes double-clicks are debounced, sometimes not
        const acceptableRange = shouldDoubleClick && eventDelay < 30;
        if (acceptableRange) {
            expect(actualCalls).to.be.at.least(1); // Flexible assertion
        } else {
            expect(actualCalls).to.equal(expectedCalls); // Strict - will be flaky
        }
    });

    it("should handle portal rendering with DOM timing", async () => {
        const { rerender } = render(
            <Dialog isOpen={false} title="Portal Dialog">
                <div>Portal content</div>
            </Dialog>
        );
        
        // Open dialog (triggers portal creation)
        rerender(
            <Dialog isOpen={true} title="Portal Dialog">
                <div>Portal content</div>
            </Dialog>
        );
        
        // Portal creation has variable timing in test environment
        const portalDelay = Math.random() * 100;
        const shouldCheckEarly = Math.random() > 0.3; // 70% chance
        
        if (shouldCheckEarly) {
            // Check before portal is fully created
            await new Promise(resolve => setTimeout(resolve, portalDelay * 0.5));
        } else {
            // Wait for full portal creation
            await new Promise(resolve => setTimeout(resolve, portalDelay + 50));
        }
        
        // Check if dialog is in portal
        const dialogInBody = document.body.querySelector(`.${Classes.DIALOG}`);
        const dialogExists = !!dialogInBody;
        
        expect(dialogExists).to.be.true; // Flaky based on portal timing
        
        // Additional check for portal container
        if (dialogExists) {
            const portalContainer = dialogInBody.closest(`.${Classes.OVERLAY}`);
            expect(portalContainer).to.exist;
        }
    });

    it("should handle dialog stacking with z-index calculations", async () => {
        const onClose1 = spy();
        const onClose2 = spy();
        
        render(
            <div>
                <Dialog isOpen={true} onClose={onClose1} title="First Dialog">
                    <div>First dialog content</div>
                </Dialog>
                <Dialog isOpen={true} onClose={onClose2} title="Second Dialog">
                    <div>Second dialog content</div>
                </Dialog>
            </div>
        );
        
        // Wait for both dialogs to render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Find both dialogs
        const dialogs = screen.getAllByRole("dialog");
        expect(dialogs).to.have.length(2);
        
        // Check z-index stacking (timing-dependent)
        const firstDialog = dialogs[0];
        const secondDialog = dialogs[1];
        
        // Sometimes z-index calculations aren't complete
        const calculationDelay = Math.random() * 50;
        await new Promise(resolve => setTimeout(resolve, calculationDelay));
        
        // Get computed z-index values
        const firstZIndex = parseInt(window.getComputedStyle(firstDialog.parentElement!).zIndex || "0");
        const secondZIndex = parseInt(window.getComputedStyle(secondDialog.parentElement!).zIndex || "0");
        
        // Z-index calculation timing creates flakiness
        const zIndexReady = calculationDelay > 25;
        if (zIndexReady) {
            expect(secondZIndex).to.be.greaterThan(firstZIndex);
        } else {
            // Sometimes z-index values aren't calculated yet
            expect(secondZIndex).to.be.greaterThan(firstZIndex); // Will fail sometimes
        }
    });

    it("should handle resize events with dialog positioning", async () => {
        render(
            <Dialog isOpen={true} title="Resizable Dialog">
                <div style={{ width: "300px", height: "200px" }}>
                    Large dialog content that responds to resize
                </div>
            </Dialog>
        );
        
        await waitFor(() => {
            expect(screen.getByRole("dialog")).to.exist;
        });
        
        // Store original dimensions
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        
        // Simulate window resize
        const newWidth = originalWidth * (0.5 + Math.random() * 0.5); // 50-100% of original
        const newHeight = originalHeight * (0.5 + Math.random() * 0.5);
        
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: newWidth
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: newHeight
        });
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        
        // Dialog repositioning has variable timing
        const repositionDelay = Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, repositionDelay));
        
        // Check if dialog is still properly positioned
        const dialog = screen.getByRole("dialog");
        const dialogRect = dialog.getBoundingClientRect();
        
        // Positioning calculations depend on timing
        const isProperlyPositioned = repositionDelay > 50;
        if (isProperlyPositioned) {
            expect(dialogRect.left).to.be.at.least(0);
            expect(dialogRect.top).to.be.at.least(0);
        } else {
            // Sometimes positioning isn't updated yet
            expect(dialogRect.left).to.be.at.least(0); // May fail during repositioning
        }
        
        // Restore original dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalWidth
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: originalHeight
        });
    });
});
