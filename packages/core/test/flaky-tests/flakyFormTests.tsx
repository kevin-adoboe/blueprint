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
import React from "react";
import { spy } from "sinon";

import { Button, FormGroup, InputGroup, NumericInput, Classes } from "../../src";

/**
 * INTENTIONALLY FLAKY TESTS FOR CIRCLECI FLAKY TEST DETECTION
 * These tests simulate real-world form validation and network timing issues
 */
describe("Form Components - Flaky Tests", () => {
    it("should handle form submission with network simulation", async () => {
        const onSubmit = spy();
        
        const FormComponent = () => {
            const handleSubmit = async (e: React.FormEvent) => {
                e.preventDefault();
                
                // Simulate network request delay
                const networkDelay = Math.random() * 200 + 100; // 100-300ms
                const networkSuccess = Math.random() > 0.3; // 70% success rate
                
                await new Promise(resolve => setTimeout(resolve, networkDelay));
                
                if (networkSuccess) {
                    onSubmit("success");
                } else {
                    onSubmit("error");
                }
            };
            
            return (
                <form onSubmit={handleSubmit}>
                    <FormGroup label="Username">
                        <InputGroup placeholder="Enter username" />
                    </FormGroup>
                    <Button type="submit">Submit</Button>
                </form>
            );
        };
        
        render(<FormComponent />);
        
        const input = screen.getByPlaceholderText("Enter username");
        const submitButton = screen.getByText("Submit");
        
        // Fill form
        await userEvent.type(input, "testuser");
        await userEvent.click(submitButton);
        
        // Wait for "network" response with variable timing
        const waitTime = Math.random() > 0.3 ? 400 : 150; // 70% wait longer
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Assertion depends on network simulation outcome
        expect(onSubmit.called).to.be.true;
        
        // This will be flaky based on simulated network success/failure
        const wasSuccessful = onSubmit.calledWith("success");
        expect(wasSuccessful).to.be.true; // Fails ~30% due to simulated network errors
    });

    it("should validate input with debounced async validation", async () => {
        let validationResult = "pending";
        
        const ValidatedInput = () => {
            const [value, setValue] = React.useState("");
            const [isValid, setIsValid] = React.useState<boolean | null>(null);
            
            React.useEffect(() => {
                if (!value) return;
                
                // Debounced validation with random delay
                const validationDelay = Math.random() * 150 + 50; // 50-200ms
                const timer = setTimeout(async () => {
                    // Simulate async validation (API call)
                    const validationSuccess = Math.random() > 0.3; // 70% success
                    
                    await new Promise(resolve => setTimeout(resolve, validationDelay));
                    
                    if (validationSuccess && value.length > 3) {
                        setIsValid(true);
                        validationResult = "valid";
                    } else {
                        setIsValid(false);
                        validationResult = "invalid";
                    }
                }, 100);
                
                return () => clearTimeout(timer);
            }, [value]);
            
            return (
                <FormGroup 
                    label="Validated Field"
                    intent={isValid === false ? "danger" : undefined}
                >
                    <InputGroup 
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter valid text"
                    />
                </FormGroup>
            );
        };
        
        const { container } = render(<ValidatedInput />);
        const input = screen.getByPlaceholderText("Enter valid text");
        
        // Type valid text
        await userEvent.type(input, "valid text");
        
        // Wait for debounced validation with variable timing
        const shouldWaitLonger = Math.random() > 0.3; // 70% chance
        const waitTime = shouldWaitLonger ? 300 : 120;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Check validation result - timing and random validation create flakiness
        const formGroup = container.querySelector(`.${Classes.FORM_GROUP}`);
        const hasDangerIntent = formGroup?.classList.contains(Classes.INTENT_DANGER);
        
        if (validationResult === "valid") {
            expect(hasDangerIntent).to.be.false;
        } else if (validationResult === "invalid") {
            expect(hasDangerIntent).to.be.true;
        } else {
            // Validation still pending - flaky timing
            expect(hasDangerIntent).to.be.false; // May fail if validation is slow
        }
    });

    it("should handle numeric input with rapid value changes", async () => {
        const onChange = spy();
        
        render(
            <FormGroup label="Amount">
                <NumericInput 
                    value={0}
                    onValueChange={onChange}
                    min={0}
                    max={1000}
                />
            </FormGroup>
        );
        
        const input = screen.getByDisplayValue("0");
        
        // Simulate rapid typing that happens in real usage
        const values = ["1", "12", "123", "1234"];
        
        for (const value of values) {
            // Clear and type new value rapidly
            await userEvent.clear(input);
            
            // Variable delay between keystrokes
            const keystrokeDelay = Math.random() * 20; // 0-20ms
            await new Promise(resolve => setTimeout(resolve, keystrokeDelay));
            
            await userEvent.type(input, value);
            
            // Sometimes validation/onChange is slower than typing
            const processingDelay = Math.random() * 30;
            await new Promise(resolve => setTimeout(resolve, processingDelay));
        }
        
        // Final wait for all change events to process
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Change events may be debounced/batched unpredictably
        const expectedMinimumCalls = 2; // At least some calls should happen
        const actualCalls = onChange.callCount;
        
        expect(actualCalls).to.be.at.least(expectedMinimumCalls);
        
        // This assertion will be flaky based on event timing
        const expectedExactCalls = values.length;
        expect(actualCalls).to.equal(expectedExactCalls); // Fails when events are batched
    });

    it("should handle form reset with component state synchronization", async () => {
        const FormWithReset = () => {
            const [username, setUsername] = React.useState("");
            const [email, setEmail] = React.useState("");
            const [resetKey, setResetKey] = React.useState(0);
            
            const handleReset = () => {
                // Reset with timing variations
                const resetDelay = Math.random() * 50;
                
                setTimeout(() => {
                    setUsername("");
                    setEmail("");
                    setResetKey(prev => prev + 1); // Force re-render
                }, resetDelay);
            };
            
            return (
                <form key={resetKey}>
                    <FormGroup label="Username">
                        <InputGroup 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                        />
                    </FormGroup>
                    <FormGroup label="Email">
                        <InputGroup 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                        />
                    </FormGroup>
                    <Button onClick={handleReset} type="button">Reset</Button>
                </form>
            );
        };
        
        render(<FormWithReset />);
        
        const usernameInput = screen.getByPlaceholderText("Username");
        const emailInput = screen.getByPlaceholderText("Email");
        const resetButton = screen.getByText("Reset");
        
        // Fill form
        await userEvent.type(usernameInput, "testuser");
        await userEvent.type(emailInput, "test@example.com");
        
        // Verify form is filled
        expect(usernameInput).to.have.value("testuser");
        expect(emailInput).to.have.value("test@example.com");
        
        // Reset form
        await userEvent.click(resetButton);
        
        // Race condition: check reset state before async reset completes
        const checkDelay = Math.random() > 0.3 ? 100 : 20; // 70% wait longer
        await new Promise(resolve => setTimeout(resolve, checkDelay));
        
        // State synchronization timing creates flakiness
        const usernameCleared = (usernameInput as HTMLInputElement).value === "";
        const emailCleared = (emailInput as HTMLInputElement).value === "";
        
        if (checkDelay > 60) {
            expect(usernameCleared).to.be.true;
            expect(emailCleared).to.be.true;
        } else {
            // Sometimes we check before async reset completes
            expect(usernameCleared).to.be.true; // Flaky timing
            expect(emailCleared).to.be.true; // Flaky timing
        }
    });

    it("should handle input focus management with tab navigation", async () => {
        render(
            <form>
                <FormGroup label="First Field">
                    <InputGroup placeholder="First input" />
                </FormGroup>
                <FormGroup label="Second Field">
                    <InputGroup placeholder="Second input" />
                </FormGroup>
                <FormGroup label="Third Field">
                    <InputGroup placeholder="Third input" />
                </FormGroup>
                <Button type="submit">Submit</Button>
            </form>
        );
        
        const firstInput = screen.getByPlaceholderText("First input");
        const secondInput = screen.getByPlaceholderText("Second input");
        const thirdInput = screen.getByPlaceholderText("Third input");
        
        // Start with first input focused
        firstInput.focus();
        expect(document.activeElement).to.equal(firstInput);
        
        // Tab through fields with variable timing
        const tabDelays = [
            Math.random() * 30,
            Math.random() * 30,
            Math.random() * 30
        ];
        
        // Tab to second input
        await userEvent.tab();
        await new Promise(resolve => setTimeout(resolve, tabDelays[0]));
        
        // Focus management timing varies in test environment
        const secondFocused = document.activeElement === secondInput;
        
        // Tab to third input
        await userEvent.tab();
        await new Promise(resolve => setTimeout(resolve, tabDelays[1]));
        
        const thirdFocused = document.activeElement === thirdInput;
        
        // Final tab to submit button
        await userEvent.tab();
        await new Promise(resolve => setTimeout(resolve, tabDelays[2]));
        
        const submitButton = screen.getByText("Submit");
        const submitFocused = document.activeElement === submitButton;
        
        // Focus timing creates flakiness in tab navigation
        const allTabsWorked = secondFocused && thirdFocused && submitFocused;
        const averageDelay = tabDelays.reduce((a, b) => a + b, 0) / tabDelays.length;
        
        if (averageDelay > 15) {
            expect(allTabsWorked).to.be.true;
        } else {
            // Quick succession sometimes breaks focus management
            expect(allTabsWorked).to.be.true; // Fails with fast tab navigation
        }
    });

    it("should handle form validation with multiple field dependencies", async () => {
        const ValidationForm = () => {
            const [password, setPassword] = React.useState("");
            const [confirmPassword, setConfirmPassword] = React.useState("");
            const [validationState, setValidationState] = React.useState<{
                password: boolean | null;
                confirmPassword: boolean | null;
            }>({ password: null, confirmPassword: null });
            
            React.useEffect(() => {
                // Validation with variable timing
                const validationDelay = Math.random() * 100 + 50;
                
                const timer = setTimeout(() => {
                    const passwordValid = password.length >= 8;
                    const confirmValid = password === confirmPassword && confirmPassword.length > 0;
                    
                    // Sometimes validation logic has bugs that cause flakiness
                    const validationReliability = Math.random() > 0.3; // 70% reliable
                    
                    if (validationReliability) {
                        setValidationState({
                            password: passwordValid,
                            confirmPassword: confirmValid
                        });
                    } else {
                        // Simulate validation bug
                        setValidationState({
                            password: Math.random() > 0.5,
                            confirmPassword: Math.random() > 0.5
                        });
                    }
                }, validationDelay);
                
                return () => clearTimeout(timer);
            }, [password, confirmPassword]);
            
            return (
                <form>
                    <FormGroup 
                        label="Password"
                        intent={validationState.password === false ? "danger" : undefined}
                    >
                        <InputGroup 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                        />
                    </FormGroup>
                    <FormGroup 
                        label="Confirm Password"
                        intent={validationState.confirmPassword === false ? "danger" : undefined}
                    >
                        <InputGroup 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                        />
                    </FormGroup>
                </form>
            );
        };
        
        const { container } = render(<ValidationForm />);
        
        const passwordInput = screen.getByPlaceholderText("Password");
        const confirmInput = screen.getByPlaceholderText("Confirm password");
        
        // Enter valid password
        await userEvent.type(passwordInput, "validpass123");
        
        // Enter matching confirmation with delay
        await new Promise(resolve => setTimeout(resolve, 50));
        await userEvent.type(confirmInput, "validpass123");
        
        // Wait for validation with variable timing
        const validationWait = Math.random() > 0.3 ? 200 : 80;
        await new Promise(resolve => setTimeout(resolve, validationWait));
        
        // Check validation states
        const formGroups = container.querySelectorAll(`.${Classes.FORM_GROUP}`);
        const passwordGroup = formGroups[0];
        const confirmGroup = formGroups[1];
        
        const passwordHasError = passwordGroup.classList.contains(Classes.INTENT_DANGER);
        const confirmHasError = confirmGroup.classList.contains(Classes.INTENT_DANGER);
        
        // Validation should pass for matching valid passwords
        expect(passwordHasError).to.be.false;
        expect(confirmHasError).to.be.false; // Flaky due to validation timing and reliability
    });
});


