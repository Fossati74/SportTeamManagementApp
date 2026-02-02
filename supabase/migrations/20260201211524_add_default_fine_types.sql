/*
  # Add Default Fine Types

  1. Data
    - Insert common fine types for sports team management
    - Types include: Retard (2€), Oubli de matériel (5€), Faute technique (3€), Absence non justifiée (10€)
  
  2. Notes
    - These are example fine types that can be modified by admins
    - All amounts are in euros
*/

-- Insert default fine types if they don't exist
INSERT INTO fine_types (name, amount)
SELECT name, amount FROM (
  VALUES 
    ('Retard', 2.00),
    ('Oubli de matériel', 5.00),
    ('Faute technique', 3.00),
    ('Absence non justifiée', 10.00),
    ('Mauvais comportement', 5.00)
) AS new_types(name, amount)
WHERE NOT EXISTS (
  SELECT 1 FROM fine_types WHERE fine_types.name = new_types.name
);