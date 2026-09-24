-- =========================================================
-- ALSAFWA PRODUCTS - INTERNAL ITEM NUMBERS
-- 62 PRICED PRODUCTS
-- =========================================================

-- 1) Add item_number column if it does not exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS item_number INTEGER;


-- 2) Make sure existing duplicate/old item numbers do not
-- interfere with the unique constraint
UPDATE public.products
SET item_number = NULL;


-- 3) Update the 62 approved products
UPDATE public.products AS p
SET
    item_number = v.item_number,
    name = v.name,
    price = v.price,
    updated_at = NOW()
FROM (
    VALUES
        (1,   'SU001-SP',  'ALBUMIN (2 x 50)', 325.00),
        (2,   'SU005',     'BILIRUBIN TOTAL + DIRECT DMSO (2 x 125)', 540.00),
        (3,   'SU005-SP',  'BILIRUBIN TOTAL + DIRECT DMSO (2 x 50)', 375.00),
        (4,   'SU007-SP',  'CALCIUM ARSENAZO III (2 x 50)', 520.00),
        (5,   'SU009-SP',  'CALCIUM OCC V/V (2 x 50)', 375.00),
        (6,   'SU011',     'CHOLESTEROL LIQUID STABLE (2 x 50)', 520.00),
        (7,   'SU014',     'HDL-CHOLESTEROL (Precipitating reagent only) (3 x 10)', 840.00),
        (8,   'SU014LQ',   'HDL-CHOLESTEROL DIRECT (30+10+Cal)', 2100.00),
        (9,   'SU015',     'CRETININE JAFFE (2 x 125)', 630.00),
        (10,  'SU015-SP',  'CRETININE JAFFE (2 x 50)', 350.00),
        (11,  'SU018',     'GLUCOSE LIQUID STABLE (2 x 125)', 485.00),
        (12,  'SU019',     'GLUCOSE LIQUID STABLE (4 x 250)', 1200.00),
        (13,  'SU027-SP',  'PHOSPHORUS UV (2 x 50)', 375.00),
        (56,  'SU025',     'MAGNESIUM CALMAGITE (2 x 125)', 975.00),
        (51,  'SU022SP',   'Iron (40+10)', 780.00),
        (52,  'SU023',     'TIBC (50T)', 780.00),
        (14,  'SU029SP',   'TOTAL PROTEIN (2 x 50)', 325.00),
        (63,  'SU031',     'Proteins in Urine & CSF (2 x 125 + Cal)', 790.00),
        (15,  'SU033',     'TRIGLYCERIDES LIQUID STABLE (2 x 50)', 980.00),
        (16,  'SU037-SP',  'UREA UV LQ (40 + 10)', 430.00),
        (61,  'SU038',     'UREA-B (2 x 125)', 1000.00),
        (17,  'SU042',     'URIC ACID LIQUID STABLE (2 x 50)', 450.00),
        (18,  'EZ002LQ-SP','ALKALINE PHOSPHATASE /ALP LQ (40 + 10)', 375.00),
        (53,  'EZ001',     'Acid phosphetase (19x2 ml)', 1150.00),
        (19,  'EZ004-SP',  'AMYLASE LIQUID STABLE (5 x 10)', 1550.00),
        (54,  'EZ025',     'LIPASE LQ (4 x 10)', 6500.00),
        (20,  'EZ007',     'CK-NAC-LQ (20 + 5)', 975.00),
        (21,  'EZ008SP',   'CK-MB-LQ (20 + 5)', 1800.00),
        (22,  'EZ012LQ',   'GOT/AST LQ (100+ 25)', 740.00),
        (23,  'EZ012LQ-SP','GOT/AST LQ (40 + 10)', 375.00),
        (24,  'EZ016LQ',   'GPT/ALT LQ (100 + 25)', 740.00),
        (25,  'EZ016LQ-SP','GPT/ALT LQ (40 + 10)', 375.00),
        (57,  'EZ009-SP',  'GAMMA-GT LQ (40 + 10)', 690.00),
        (26,  'EZ021LQ-SP','LDH LQ (40 + 10)', 375.00),
        (62,  'SU002',     'NH3 (40 + 10)', 1500.00),
        (27,  'QC008',     'CK-MB CONTROL (1 x 3)', 1500.00),
        (58,  'QC003',     'Control Human Normal (Vail 5 mL)', 830.00),
        (59,  'QC004',     'Control Human Pathologica (Vail 5 mL)', 830.00),
        (28,  'SE003',     'ASO LATEX REAGENT (5ml)', 425.00),
        (29,  'SE007',     'CRP LATEX REAGENT (5ml)', 425.00),
        (30,  'SE011',     'RF LATEX REAGENT (5ml)', 400.00),
        (64,  'SE024',     'ROSE BENGAL (5ml + 1ml + 1ml)', 1500.00),
        (31,  'SE028',     'S. Paratyhi AH (5 ml)', 250.00),
        (32,  'SE030',     'S. Paratyhi BH (5 ml)', 250.00),
        (33,  'SE033',     'S. Tyhi O (5 ml)', 250.00),
        (34,  'SE034',     'S. Tyhi H (5 ml)', 250.00),
        (35,  'SE035',     'Brucella Abortus (5 ml)', 275.00),
        (36,  'SE035-M',   'Brucella Mellitensis (5 ml)', 275.00),
        (37,  'SEWK4X5',   'Widal group Bacterial Antigens (4 x 5 ml)', 900.00),
        (38,  'TL015',     'ASO TURBI. (10+40 + Cal)', 1950.00),
        (39,  'TL025',     'RF TURBI. (10+40 + Cal)', 1800.00),
        (40,  'TL035',     'CRP TURBI. (10+40+ Cal)', 1800.00),
        (55,  'TL090',     'MICROALBUMIN TURBI. (5+45+CAL)', 3400.00),
        (44,  'IT090',     'C3 (40 +10)', 2550.00),
        (45,  'IT100',     'C4 (40 +10)', 2550.00),
        (46,  'IT120',     'IgA (40 +10)', 2550.00),
        (47,  'IT130',     'IgG (40 +10)', 2550.00),
        (48,  'IT140',     'IgM (40 +10)', 2550.00),
        (50,  'IT210',     'PROT CAL (1 x 2)', 2950.00),
        (100, 'R01012',    'PT (4 X 10)', 2100.00),
        (101, 'R07912 LQ', 'PT (Liquid) (5 X 10)', 2250.00),
        (102, 'R01112LQ',  'PTT (4 x 10)', 2600.00)
) AS v(item_number, product_code, name, price)
WHERE p.product_code = v.product_code;


-- 4) Add unique constraint/index for item_number
CREATE UNIQUE INDEX IF NOT EXISTS products_item_number_unique
ON public.products(item_number);


-- 5) Verification
SELECT
    item_number,
    product_code,
    name,
    price
FROM public.products
WHERE item_number IS NOT NULL
ORDER BY item_number;